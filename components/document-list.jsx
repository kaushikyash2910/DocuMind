"use client";
import Link from "next/link";

export default function DocumentList({ documents, selectedIds, onToggle }) {
  if (!documents.length) {
    return (
      <p className="text-sm text-[#F7F3E9]/50 font-[family-name:var(--font-mono)] text-center py-12">
        The archive is empty. Add a document above to begin.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {documents.map((doc) => (
        <div key={doc.id} className="group relative rounded-lg bg-[#EAE0C8] p-5 text-[#241F1A] shadow-[0_4px_0_0_rgba(0,0,0,0.15)]">
          {onToggle && (
            <label className="absolute top-4 right-4 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds?.includes(doc.id)}
                onChange={() => onToggle(doc.id)}
                className="peer sr-only"
              />
              <div className="h-5 w-5 rounded border-2 border-[#241F1A]/30 flex items-center justify-center text-xs font-bold text-white transition-colors peer-checked:bg-[#C1442D] peer-checked:border-[#C1442D]">
                <span className="hidden peer-checked:inline">✓</span>
              </div>
            </label>
          )}
          <div className="absolute -top-2 left-5 h-2 w-12 rounded-t bg-[#A98F5A]" />
          <p className="font-[family-name:var(--font-display)] text-lg font-medium pr-8 leading-tight">{doc.title}</p>
          <p className="mt-1 text-xs text-[#241F1A]/50 font-[family-name:var(--font-mono)]">{doc.fileName}</p>
          {doc.summary && <p className="mt-2 text-sm text-[#241F1A]/70 leading-snug">{doc.summary}</p>}
          <div className="mt-4 flex items-center justify-between">
            <div className="inline-flex items-center justify-center rounded-full border-2 border-[#C1442D] text-[#C1442D] w-14 h-14 -rotate-12 font-[family-name:var(--font-mono)] text-xs font-bold leading-none" title={`${doc.chunkCount} chunks indexed`}>
              <span>{doc.chunkCount}<br/>ch.</span>
            </div>
            <Link href={`/documents/${doc.id}`} className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-wide text-[#241F1A]/60 hover:text-[#C1442D] transition-colors">
              Open →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}