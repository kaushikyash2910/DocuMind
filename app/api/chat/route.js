import { db } from "@/lib/prisma";
import { retrieveChunks } from "@/lib/retrieval";
import { groq } from "@/lib/groq";
import { evaluate } from "mathjs";

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
      description: "List the titles of the documents available, without searching their content.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description: "Evaluate a mathematical expression. Use this for any arithmetic instead of computing it yourself.",
      parameters: {
        type: "object",
        properties: { expression: { type: "string", description: "e.g. '1234 * 5.6' or '(200-150)/150*100'" } },
        required: ["expression"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the live web. Only use this when the question clearly needs information that isn't in the uploaded documents — never as a first resort.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "A focused web search query" } },
        required: ["query"],
      },
    },
  },
];

async function calculate(expression) {
  try {
    return { result: String(evaluate(expression)) };
  } catch (err) {
    return { error: `Could not evaluate: ${err.message}` };
  }
}

async function webSearch(query) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, max_results: 3 }),
  });
  const data = await res.json();
  return (data.results || []).map((r) => ({ title: r.title, url: r.url, content: r.content }));
}

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

        await db.message.create({ data: { conversationId: conversation.id, role: "user", content: question } });

        const messages = [
          {
            role: "system",
            content:
              "You answer questions about the user's documents. Use search_documents to look inside the documents (as many times as needed, reformulating the query if needed), list_documents to see what's available, calculate for any arithmetic, and web_search only when the question clearly needs information the documents don't contain — prefer the documents first, web_search is a last resort, not a default. When citing document-based facts, use simple bracketed numbers like [1], [2] matching the order sources were given to you — never invent metadata like line or page numbers. If you still can't find an answer after searching, say so.",
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
            data: { messageId: assistantMessage.id, question, steps: finalSteps, toolCalls: toolCallLog, totalDurationMs: Date.now() - requestStart },
          });
        }

        for (let step = 0; step < 4; step++) {
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
            const args = JSON.parse(call.function.arguments || "{}");

            if (call.function.name === "search_documents") {
              const results = await retrieveChunks(args.query, documentIds);
              allSources.push(...results);
              toolCallLog.push({ tool: "search_documents", query: args.query, resultCount: results.length, durationMs: Date.now() - t0 });
              messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(results.map((r) => ({ content: r.content, source: r.title }))) });
            } else if (call.function.name === "list_documents") {
              const docs = await db.document.findMany({ where: { id: { in: documentIds } }, select: { id: true, title: true } });
              toolCallLog.push({ tool: "list_documents", query: null, resultCount: docs.length, durationMs: Date.now() - t0 });
              messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(docs) });
            } else if (call.function.name === "calculate") {
              const calcResult = await calculate(args.expression);
              toolCallLog.push({ tool: "calculate", query: args.expression, resultCount: 1, durationMs: Date.now() - t0 });
              messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(calcResult) });
            } else if (call.function.name === "web_search") {
              const webResults = await webSearch(args.query);
              toolCallLog.push({ tool: "web_search", query: args.query, resultCount: webResults.length, durationMs: Date.now() - t0 });
              messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(webResults) });
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