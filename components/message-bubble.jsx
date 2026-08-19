import ReactMarkdown from "react-markdown";
import CitationFootnote from "@/components/citation-footnote";

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${isUser ? "bg-[#C1442D] text-[#F7F3E9]" : "bg-[#EAE0C8] text-[#241F1A]"}`}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="[&_table]:border-collapse [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_strong]:font-semibold">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        {!isUser && message.steps > 1 && (
          <p className="mt-2 text-xs text-[#241F1A]/50 font-[family-name:var(--font-mono)]">🔎 Searched {message.steps} times before answering</p>
        )}
        {!isUser && message.sources?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.sources.map((s, i) => <CitationFootnote key={s.id} index={i + 1} source={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}