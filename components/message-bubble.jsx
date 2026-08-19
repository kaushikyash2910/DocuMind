import CitationFootnote from "@/components/citation-footnote";

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
          isUser ? "bg-black text-white" : "bg-gray-100 text-gray-900"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {!isUser && message.steps > 1 && (
          <p className="mt-2 text-xs text-gray-500">
            🔎 Searched {message.steps} times before answering
          </p>
        )}

        {!isUser && message.sources?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.sources.map((s, i) => (
              <CitationFootnote key={s.id} index={i + 1} source={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}