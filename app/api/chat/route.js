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
];

function dedupe(sources) {
  const seen = new Map();
  for (const s of sources) seen.set(s.id, s);
  return Array.from(seen.values());
}

export async function POST(req) {
  const { question, documentIds } = await req.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event, data) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`));

      try {
        const messages = [
          {
            role: "system",
            content:
              "You answer questions about the user's documents. Use search_documents as many times as needed to gather enough context — reformulate the query if the first search doesn't give you what you need. When citing, use simple bracketed numbers like [1], [2] matching the order sources were given to you — never invent metadata like line numbers, page numbers, or file details that weren't provided. If after searching you still can't find the answer, say so.",
          },
          { role: "user", content: question },
        ];
        const allSources = [];
        let steps = 0;

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
            send("done", { answer: msg.content, steps, sources: dedupe(allSources) });
            controller.close();
            return;
          }

          for (const call of msg.tool_calls) {
            const { query } = JSON.parse(call.function.arguments);
            const results = await retrieveChunks(query, documentIds);
            allSources.push(...results);
            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify(results.map((r) => ({ content: r.content, source: r.title }))),
            });
          }
        }

        // Loop hit its cap — force a final answer now, and this time stream it.
        messages.push({ role: "user", content: "Based on everything you've found, give your final answer now." });
        const groqStream = await groq.chat.completions.create({
          model: "openai/gpt-oss-120b",
          messages,
          stream: true,
        });

        let fullText = "";
        for await (const chunk of groqStream) {
          const delta = chunk.choices[0]?.delta?.content || "";
          if (delta) {
            fullText += delta;
            send("token", { delta });
          }
        }
        send("done", { answer: fullText, steps: steps + 1, sources: dedupe(allSources) });
        controller.close();
      } catch (err) {
        send("error", { message: err.message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}