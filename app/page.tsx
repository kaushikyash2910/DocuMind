import Link from "next/link";
import { getDocuments } from "@/actions/documents";
import HomeSearch from "@/components/home-search";

export default async function Home() {
  const documents = await getDocuments();
  const totalChunks = documents.reduce((sum: number, d: any) => sum + d.chunkCount, 0);
  const recent = documents.slice(0, 3);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="max-w-2xl text-center space-y-10">
        <div className="space-y-8">
          <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.3em] uppercase text-[#A98F5A]">
            Est. in a terminal, tonight
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-6xl font-semibold leading-tight">
            DocuMind
          </h1>
          <p className="text-[#A98F5A] text-lg max-w-md mx-auto">
            File a document into the archive. Ask it anything. Every answer comes back stamped with exactly where it came from.
          </p>
          <div className="flex justify-center gap-6 font-[family-name:var(--font-mono)] text-xs text-[#F7F3E9]/50">
            <span>{documents.length} document{documents.length !== 1 ? "s" : ""} filed</span>
            <span>·</span>
            <span>{totalChunks} passage{totalChunks !== 1 ? "s" : ""} indexed</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-left">
          <div className="rounded-lg bg-[#EAE0C8] p-4 text-[#241F1A]">
            <p className="font-[family-name:var(--font-mono)] text-xs text-[#C1442D] font-bold mb-1">01</p>
            <p className="font-[family-name:var(--font-display)] text-sm font-semibold mb-1">File it</p>
            <p className="text-xs text-[#241F1A]/60">Drop in a PDF, DOCX, or TXT — chunked and indexed automatically.</p>
          </div>
          <div className="rounded-lg bg-[#EAE0C8] p-4 text-[#241F1A]">
            <p className="font-[family-name:var(--font-mono)] text-xs text-[#C1442D] font-bold mb-1">02</p>
            <p className="font-[family-name:var(--font-display)] text-sm font-semibold mb-1">Ask it</p>
            <p className="text-xs text-[#241F1A]/60">The agent searches your documents as many times as it needs to.</p>
          </div>
          <div className="rounded-lg bg-[#EAE0C8] p-4 text-[#241F1A]">
            <p className="font-[family-name:var(--font-mono)] text-xs text-[#C1442D] font-bold mb-1">03</p>
            <p className="font-[family-name:var(--font-display)] text-sm font-semibold mb-1">Verify it</p>
            <p className="text-xs text-[#241F1A]/60">Every answer is stamped with a citation you can click straight to the source.</p>
          </div>
        </div>

        <HomeSearch />

        {recent.length > 0 && (
          <div className="text-left">
            <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wide text-[#A98F5A] mb-3">
              Recently filed
            </p>
            <div className="space-y-2">
            {recent.map((doc: any) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="block rounded bg-[#EAE0C8]/10 hover:bg-[#EAE0C8]/20 px-4 py-2 text-sm transition-colors"
                >
                  {doc.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4">
          <Link href="/dashboard" className="rounded bg-[#C1442D] px-6 py-3 text-sm font-medium hover:bg-[#a83a26] transition-colors">
            Upload documents
          </Link>
          <Link href="/chat" className="rounded border border-[#A98F5A]/40 px-6 py-3 text-sm font-medium hover:border-[#A98F5A]/70 transition-colors">
            Start chatting
          </Link>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex items-center justify-center rounded-full border-2 border-[#C1442D] text-[#C1442D] w-16 h-16 -rotate-12 font-[family-name:var(--font-mono)] text-[10px] font-bold leading-none">
            <span>GROUNDED<br/>[1]</span>
          </div>
        </div>
      </div>
    </div>
  );
}