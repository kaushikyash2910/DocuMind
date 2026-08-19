import { db } from "@/lib/prisma";
import { retrieveChunks } from "@/lib/retrieval";
import { groq } from "@/lib/groq";

const tools = [
  {
    type: "function",
    function: {
      name: "search_documents",
      description: "Search the uploaded documents for relevant passages. Call multiple times with different queries if the question has multiple parts.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "A focused search query" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_documents",
      description: "List the titles of the documents available, without searching their content. Use this when the question is about the documents themselves (e.g. 'how many documents are there') rather than their content.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

function dedupe(sources) {
  const seen = new Map();
  for (const s of sources) seen.set(s.id, s);
  return Array.from(seen.values());
}

export async function POST(req) {
  const { question, documentIds, conversationId: existingConversationId } = await req.json();
  const encoder = new TextEncoder();
  const requestStart = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event, data) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`));

      try {
        const conversation = existingConversationId
          ? { id: existingConversationId }
          : await db.conversation.create({ data: { title: question.slice(0, 60) } });

        await db.message.create({
          data: { conversationId: conversation.id, role: "user", content: question },
        });

        const messages = [
          {
            role: "system",
            content:
              "You answer questions about the user's documents. Use search_documents as many times as needed — reformulate the query if the first search doesn't give you what you need. Use list_documents if the question is about the documents themselves rather than their content. When citing, use simple bracketed numbers like [1], [2] matching the order sources were given to you — never invent metadata like line numbers or page numbers. If after searching you still can't find the answer, say so.",
          },
          { role: "user", content: question },
        ];
        const allSources = [];
        const toolCallLog = [];
        let steps = 0;

        async function saveFinalTurn(answerText, finalSteps) {
          const assistantMessage = await db.message.create({
            data: { conversationId: conversation.id, role: "assistant", content: answerText, citations: dedupe(allSources) },
          });
          await db.agentTrace.create({
            data: {
              messageId: assistantMessage.id,
              question,
              steps: finalSteps,
              toolCalls: toolCallLog,
              totalDurationMs: Date.now() - requestStart,
            },
          });
        }

        for (let step = 0; step < 3; step++) {
          const completion = await groq.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages,
            tools,
            tool_choice: "auto",
          });
          const msg = completion.choices[0].message;
          messages.push(msg);
          steps++;

          if (!msg.tool_calls) {
            await saveFinalTurn(msg.content, steps);
            send("done", { answer: msg.content, steps, sources: dedupe(allSources), conversationId: conversation.id });
            controller.close();
            return;
          }

          for (const call of msg.tool_calls) {
            const t0 = Date.now();
            if (call.function.name === "search_documents") {
              const { query } = JSON.parse(call.function.arguments);
              const results = await retrieveChunks(query, documentIds);
              allSources.push(...results);
              toolCallLog.push({ tool: "search_documents", query, resultCount: results.length, durationMs: Date.now() - t0 });
              messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(results.map((r) => ({ content: r.content, source: r.title }))) });
            } else if (call.function.name === "list_documents") {
              const docs = await db.document.findMany({ where: { id: { in: documentIds } }, select: { id: true, title: true } });
              toolCallLog.push({ tool: "list_documents", query: null, resultCount: docs.length, durationMs: Date.now() - t0 });
              messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(docs) });
            }
          }
        }

        messages.push({ role: "user", content: "Based on everything you've found, give your final answer now." });
        const groqStream = await groq.chat.completions.create({ model: "openai/gpt-oss-120b", messages, stream: true });

        let fullText = "";
        for await (const chunk of groqStream) {
          const delta = chunk.choices[0]?.delta?.content || "";
          if (delta) { fullText += delta; send("token", { delta }); }
        }

        await saveFinalTurn(fullText, steps + 1);
        send("done", { answer: fullText, steps: steps + 1, sources: dedupe(allSources), conversationId: conversation.id });
        controller.close();
      } catch (err) {
        send("error", { message: err.message });
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}