"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { compareDocuments } from "@/actions/chat";

export default function CompareView({ documents }) {
  const [docA, setDocA] = useState(documents[0]?.id ?? "");
  const [docB, setDocB] = useState(documents[1]?.id ?? "");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleCompare(e) {
    e.preventDefault();
    if (!question.trim() || !docA || !docB || docA === docB) return;
    setLoading(true);
    setResult(null);
    try {
      setResult(await compareDocuments(question, docA, docB));
    } finally {
      setLoading(false);
    }
  }

  const titleA = documents.find((d) => d.id === docA)?.title;
  const titleB = documents.find((d) => d.id === docB)?.title;

  return (
    <div className="space-y-6">
      <form onSubmit={handleCompare} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <select value={docA} onChange={(e) => setDocA(e.target.value)} className="rounded border border-[#A98F5A]/40 bg-transparent px-3 py-2 text-sm">
            {documents.map((d) => <option key={d.id} value={d.id} className="text-black">{d.title}</option>)}
          </select>
          <select value={docB} onChange={(e) => setDocB(e.target.value)} className="rounded border border-[#A98F5A]/40 bg-transparent px-3 py-2 text-sm">
            {documents.map((d) => <option key={d.id} value={d.id} className="text-black">{d.title}</option>)}
          </select>
        </div>
        {docA === docB && <p className="text-xs text-[#C1442D]">Pick two different documents.</p>}
        <div className="flex gap-2">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask something to compare…"
            className="flex-1 rounded border border-[#A98F5A]/40 bg-transparent px-3 py-2 text-sm" />
          <button type="submit" disabled={loading || docA === docB} className="rounded bg-[#C1442D] px-5 py-2 text-sm font-medium disabled:opacity-50">
            {loading ? "Comparing…" : "Compare"}
          </button>
        </div>
      </form>

      {result && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-[#EAE0C8] p-5 text-[#241F1A]">
            <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wide text-[#241F1A]/50 mb-2">{titleA}</p>
            <ReactMarkdown>{result.answerA.answer}</ReactMarkdown>
          </div>
          <div className="rounded-lg bg-[#EAE0C8] p-5 text-[#241F1A]">
            <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wide text-[#241F1A]/50 mb-2">{titleB}</p>
            <ReactMarkdown>{result.answerB.answer}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}