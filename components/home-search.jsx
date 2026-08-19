"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomeSearch() {
  const [question, setQuestion] = useState("");
  const router = useRouter();

  function handleSubmit(e) {
    e.preventDefault();
    if (!question.trim()) return;
    router.push(`/chat?q=${encodeURIComponent(question)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
      <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask your archive something…"
        className="flex-1 rounded border border-[#A98F5A]/40 bg-transparent px-4 py-2 text-sm placeholder:text-[#F7F3E9]/40 focus:outline-none focus:border-[#C1442D]" />
      <button type="submit" className="rounded bg-[#C1442D] px-4 py-2 text-sm font-medium hover:bg-[#a83a26] transition-colors">Ask</button>
    </form>
  );
}