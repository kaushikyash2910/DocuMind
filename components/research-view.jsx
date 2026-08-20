"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { multiAgentAnswer } from "@/actions/multi-agent";

export default function ResearchView({ documents }) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const documentIds = documents.map((d) => d.id);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      setResult(await multiAgentAnswer(question, documentIds));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask something that needs real research across your documents…"
          className="flex-1 rounded border border-[#A98F5A]/40 bg-transparent px-3 py-2 text-sm placeholder:text-[#F7F3E9]/40" />
        <button type="submit" disabled={loading} className="rounded bg-[#C1442D] px-5 py-2 text-sm font-medium disabled:opacity-50">
          {loading ? "Researching…" : "Research"}
        </button>
      </form>

      {result && (
        <div className="space-y-4">
          <div>
            <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wide text-[#A98F5A] mb-2">
              Planner broke this into {result.subQuestions.length} sub-question{result.subQuestions.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-2">
              {result.findings.map((f, i) => (
                <details key={i} className="rounded bg-[#A98F5A] px-4 py-2">
                  <summary className="text-sm cursor-pointer text-[#F7F3E9]">{f.subQuestion}</summary>
                  <p className="text-sm text-[#F7F3E9]/70 mt-2">{f.answer}</p>
                </details>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-[#EAE0C8] p-5 text-[#241F1A]">
            <div className="flex items-center justify-between mb-2">
              <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wide text-[#241F1A]/50">
                Synthesized answer
              </p>
              <p className={`font-[family-name:var(--font-mono)] text-xs ${result.validated ? "text-green-700" : "text-[#C1442D]"}`}>
                {result.validated ? "✓ Validated" : "⚠ Unverified"}
              </p>
            </div>
            <ReactMarkdown>{result.answer}</ReactMarkdown>
            {!result.validated && result.validationIssue && (
              <p className="mt-2 text-xs text-[#C1442D]">Validator flagged: {result.validationIssue}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}