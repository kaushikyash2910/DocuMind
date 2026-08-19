"use client";

export default function CitationFootnote({ index, source }) {
  function handleClick() {
    // Works if you're already on that document's page; otherwise opens it fresh.
    const el = document.getElementById(`chunk-${source.id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-blue-400");
      setTimeout(() => el.classList.remove("ring-2", "ring-blue-400"), 2000);
    } else {
      window.open(`/documents/${source.documentId}`, "_blank");
    }
  }

  return (
    <button
      onClick={handleClick}
      title={source.title}
      className="text-xs px-1.5 py-0.5 rounded bg-white border text-gray-600 hover:bg-gray-50"
    >
      [{index}]
    </button>
  );
}