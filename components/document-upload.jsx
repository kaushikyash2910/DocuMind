"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ingestDocument } from "@/actions/documents";

export default function DocumentUpload() {
  const router = useRouter();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title || file.name);
      await ingestDocument(formData);
      setFile(null);
      setTitle("");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-lg border-2 border-dashed px-8 py-12 text-center transition-colors ${
          dragging
            ? "border-[#C1442D] bg-[#C1442D]/5"
            : "border-[#A98F5A]/40 hover:border-[#A98F5A]/70"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        <p className="font-[family-name:var(--font-display)] text-lg">
          {file ? file.name : "Drop a document into the archive"}
        </p>
        <p className="mt-1 text-xs text-[#F7F3E9]/50 font-[family-name:var(--font-mono)]">
          {file ? "Ready to file" : "PDF · click or drag to select"}
        </p>
      </div>

      {file && (
        <div className="flex gap-3 items-center">
          <input
            type="text"
            placeholder="Title this entry (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 rounded border border-[#A98F5A]/40 bg-transparent px-3 py-2 text-sm placeholder:text-[#F7F3E9]/40 focus:outline-none focus:border-[#C1442D]"
          />
          <button
            type="submit"
            disabled={uploading}
            className="rounded bg-[#C1442D] px-5 py-2 text-sm font-medium hover:bg-[#a83a26] disabled:opacity-50 transition-colors"
          >
            {uploading ? "Filing…" : "Add to archive"}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-[#C1442D]">{error}</p>}
    </form>
  );
}
