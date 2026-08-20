"use server";
import { groq } from "@/lib/groq";
import { retrieveChunks } from "@/lib/retrieval";

export async function multiAgentAnswer(question, documentIds) {
  // PLANNER
  const planCompletion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content:
          'You are planning how to search a fixed set of already-uploaded documents to answer the user\'s question. Break the question into 2-4 focused, independently-searchable sub-questions — each one phrased as something to search FOR in the documents, never as a question back to the user. You cannot ask the user anything; you can only search. If the original question is vague, make your best reasonable interpretation and search broadly rather than asking for clarification. Respond with ONLY JSON: { "subQuestions": ["...", "..."] }. If the question is already simple and single-part, return just one sub-question equal to the original.',
      },
      { role: "user", content: question },
    ],
  });

  let subQuestions;
  try {
    subQuestions = JSON.parse(planCompletion.choices[0].message.content).subQuestions;
  } catch {
    subQuestions = [question];
  }

  // RESEARCHER
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

  const findingsText = findings.map((f, i) => `Sub-question ${i + 1}: ${f.subQuestion}\nFinding: ${f.answer}`).join("\n\n");
  const seen = new Map();
  for (const f of findings) for (const s of f.sources) seen.set(s.id, s);
  const sources = Array.from(seen.values());

  // SYNTHESIZER (extracted into a function since the validator may trigger a retry)
  async function synthesize(extraInstruction = "") {
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content:
            "You are combining research findings from multiple sub-questions into one coherent answer to the user's original question. Don't just concatenate the findings — synthesize them into a unified answer. Never ask the user for clarification or more information; if the findings are thin or inconclusive, say so plainly and answer with what's actually available." +
            extraInstruction,
        },
        { role: "user", content: `Original question: ${question}\n\n${findingsText}` },
      ],
    });
    return completion.choices[0].message.content;
  }

  // VALIDATOR — checks the synthesized answer against the actual findings
  async function validate(answer) {
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content:
            'Check whether this answer is fully supported by the research findings, or whether it contains claims not present in them. Respond with ONLY JSON: { "grounded": true or false, "issue": "one sentence describing the problem, or empty string if grounded" }.',
        },
        { role: "user", content: `Findings:\n${findingsText}\n\nAnswer to check:\n${answer}` },
      ],
    });
    try {
      return JSON.parse(completion.choices[0].message.content);
    } catch {
      return { grounded: true, issue: "" }; // fail open — don't block on a validator parsing error
    }
  }

  let answer = await synthesize();
  let validation = await validate(answer);

  if (!validation.grounded) {
    // One retry, telling the synthesizer exactly what it got wrong
    answer = await synthesize(` Your previous attempt had this problem: "${validation.issue}". Stay strictly within what the findings actually say.`);
    validation = await validate(answer);
  }

  return {
    answer,
    subQuestions,
    findings,
    sources,
    validated: validation.grounded,
    validationIssue: validation.grounded ? null : validation.issue,
  };
}