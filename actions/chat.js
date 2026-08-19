"use server";

import { groq } from "@/lib/groq";
import { retrieveChunks } from "@/lib/retrieval";

export async function answerQuestion(question, documentIds) {
  const chunks = await retrieveChunks(question, documentIds);

  const context = chunks
    .map((c, i) => `[${i + 1}] (from "${c.title}")\n${c.content}`)
    .join("\n\n");

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content:
          "Answer only using the provided context. Cite sources inline as [1], [2], etc. If the context doesn't contain the answer, say so explicitly rather than guessing.",
      },
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ],
  });

  return {
    answer: completion.choices[0].message.content,
    sources: chunks,
  };
}


const tools = [
  {
    type: "function",
    function: {
      name: "search_documents",
      description:
        "Search the uploaded documents for relevant passages. Call multiple times with different queries if the question has multiple parts.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "A focused search query",
          },
        },
        required: ["query"],
      },
    },
  },
];


export async function agenticAnswer(question, documentIds) {
  const messages = [
    {
      role: "system",
      content:
        "You answer questions about the user's documents. Use search_documents as many times as needed to gather enough context — reformulate the query if the first search doesn't give you what you need. When citing, use simple bracketed numbers like [1], [2] matching the order sources were given to you — never invent metadata like line numbers, page numbers, or file details that weren't provided. If after searching you still can't find the answer, say so.",
    },
    {
      role: "user",
      content: question,
    },
  ];

  const allSources = [];

  for (let step = 0; step < 4; step++) {
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages,
      tools,
      tool_choice: "auto",
    });

    const msg = completion.choices[0].message;

    messages.push(msg);

    if (!msg.tool_calls) {
      return {
        answer: msg.content,
        steps: step + 1,
        sources: dedupeSources(allSources),
      };
    }

    for (const call of msg.tool_calls) {
      const { query } = JSON.parse(call.function.arguments);

      const results = await retrieveChunks(query, documentIds);

      allSources.push(...results);

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(
          results.map((r) => ({
            content: r.content,
            source: r.title,
          }))
        ),
      });
    }
  }

  return {
    answer: "Couldn't find a confident answer after multiple searches.",
    steps: 4,
    sources: dedupeSources(allSources),
  };
}


export async function compareDocuments(question, docIdA, docIdB) {
  const [answerA, answerB] = await Promise.all([
    answerQuestion(question, [docIdA]),
    answerQuestion(question, [docIdB]),
  ]);

  return {
    answerA,
    answerB,
  };
}


// Remove duplicate chunks returned by multiple searches
function dedupeSources(sources) {
  const seen = new Map();

  for (const s of sources) {
    seen.set(s.id, s);
  }

  return Array.from(seen.values());
}