"use client";
import { useState, useEffect } from "react";
import DocumentList from "@/components/document-list";
import MessageBubble from "@/components/message-bubble";

export default function ChatWindow({ documents, initialQuestion }) {
  const [selectedIds, setSelectedIds] = useState(documents.map((d) => d.id));
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  function toggleDoc(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function sendQuestion(question) {
    if (!question.trim() || selectedIds.length === 0) return;
    setMessages((prev) => [...prev, { role: "user", content: question }, { role: "assistant", content: "" }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, documentIds: selectedIds, conversationId }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const { event, data } = JSON.parse(part.slice(6));
          if (event === "token") {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              updated[updated.length - 1] = { ...last, content: last.content + data.delta };
              return updated;
            });
          } else if (event === "done") {
            setConversationId(data.conversationId);
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: data.answer, steps: data.steps, sources: data.sources };
              return updated;
            });
          } else if (event === "error") {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: "Something went wrong: " + data.message };
              return updated;
            });
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    const question = input;
    setInput("");
    await sendQuestion(question);
  }

  useEffect(() => {
    if (initialQuestion) sendQuestion(initialQuestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wide text-[#A98F5A] mb-3">
          Documents
        </h2>
        <DocumentList documents={documents} selectedIds={selectedIds} onToggle={toggleDoc} />
        {selectedIds.length === 0 && (
          <p className="text-xs text-[#C1442D] mt-2">Select at least one document to ask questions.</p>
        )}
      </div>

      <div className="flex flex-col rounded-lg border border-[#A98F5A]/30 h-[500px]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && <p className="text-sm text-[#C1442D]">Ask a question about your selected documents.</p>}
          {messages.map((m, i) => <MessageBubble key={i} message={m} />)}
          {loading && <p className="text-sm text-[#C1442D]">Thinking…</p>}
        </div>
        <form onSubmit={handleSend} className="border-t border-[#C1442D] p-3 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question…"
            className="flex-1 rounded border border-[#A98F5A]/40 bg-transparent px-3 py-2 text-sm placeholder:text-[#C1442D] focus:outline-none focus:border-[#C1442D]" disabled={loading} />
          <button type="submit" disabled={loading || !input.trim()} className="rounded bg-[#C1442D] px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-[#a83a26] transition-colors">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}