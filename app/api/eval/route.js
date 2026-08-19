import { NextResponse } from "next/server";
import { agenticAnswer } from "@/actions/chat";
import { groq } from "@/lib/groq";
import qaPairs from "@/tests/eval/qa-pairs.json";

export async function GET() {
  const results = [];
  for (const pair of qaPairs) {
    const result = await agenticAnswer(pair.question, pair.documentIds);
    const judgment = await judgeAnswer(pair.question, result.answer, result.sources);
    results.push({ question: pair.question, answer: result.answer, ...judgment });
  }
  const passed = results.filter((r) => r.grounded).length;
  return NextResponse.json({ passed, total: qaPairs.length, results });
}

async function judgeAnswer(question, answer, sources) {
  const context = sources.map((s) => s.content).join("\n\n");
  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: 'Grade whether an AI answer is actually supported by the provided sources. Respond with ONLY JSON: { "grounded": true or false, "reasoning": "one sentence" }. grounded is false if the answer states anything not present in or contradicted by the sources.' },
      { role: "user", content: `Sources:\n${context}\n\nQuestion: ${question}\n\nAnswer to grade: ${answer}` },
    ],
  });
  try {
    return JSON.parse(completion.choices[0].message.content);
  } catch {
    return { grounded: false, reasoning: "Judge response wasn't valid JSON" };
  }
}