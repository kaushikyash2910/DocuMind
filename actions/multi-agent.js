"use server";
import { groq } from "@/lib/groq";
import { retrieveChunks } from "@/lib/retrieval";

export async function multiAgentAnswer(question, documentIds) {
  // PLANNER — decompose into focused sub-questions
  const planCompletion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content:
          'Break the user\'s question into 2-4 focused, independently-answerable sub-questions that together cover it fully. Respond with ONLY JSON: { "subQuestions": ["...", "..."] }. If the question is already simple and single-part, return just one sub-question equal to the original.',
      },
      { role: "user", content: question },
    ],
  });

  let subQuestions;
  try {
    subQuestions = JSON.parse(planCompletion.choices[0].message.content).subQuestions;
  } catch {
    subQuestions = [question]; // fallback if the planner didn't return valid JSON
  }

  // RESEARCHER — answer each sub-question independently and in parallel, grounded in retrieval
  const findings = await Promise.all(
    subQuestions.map(async (subQ) => {
      const chunks = await retrieveChunks(subQ, documentIds);
      const context = chunks.map((c, i) => `[${i + 1}] (from "${c.title}")\n${c.content}`).join("\n\n");

      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: "Answer only using the provided context. If the context doesn't contain the answer, say so explicitly." },
          { role: "user", content: `Context:\n${context}\n\nQuestion: ${subQ}` },
        ],
      });

      return { subQuestion: subQ, answer: completion.choices[0].message.content, sources: chunks };
    })
  );

  // SYNTHESIZER — combine findings into one coherent answer
  const findingsText = findings.map((f, i) => `Sub-question ${i + 1}: ${f.subQuestion}\nFinding: ${f.answer}`).join("\n\n");

  const synthCompletion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content:
          "You are combining research findings from multiple sub-questions into one coherent answer to the user's original question. Don't just concatenate the findings — actually synthesize them into a unified answer.",
      },
      { role: "user", content: `Original question: ${question}\n\n${findingsText}` },
    ],
  });

  const seen = new Map();
  for (const f of findings) for (const s of f.sources) seen.set(s.id, s);

  return {
    answer: synthCompletion.choices[0].message.content,
    subQuestions,
    findings,
    sources: Array.from(seen.values()),
  };
}