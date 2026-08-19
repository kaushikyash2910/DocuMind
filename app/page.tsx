import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-2xl text-center space-y-8">
        <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.3em] uppercase text-[#A98F5A]">
          Est. in a terminal, tonight
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-6xl font-semibold leading-tight">
          DocuMind
        </h1>
        <p className="text-[#A98F5A]/200 text-lg max-w-md mx-auto">
          File a document into the archive. Ask it anything. Every answer comes back stamped with exactly where it came from.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link href="/dashboard" className="rounded bg-[#C1442D] px-6 py-3 text-sm font-medium hover:bg-[#a83a26] transition-colors">
            Upload documents
          </Link>
          <Link href="/chat" className="rounded border border-[#A98F5A]/40 px-6 py-3 text-sm font-medium hover:border-[#A98F5A]/70 transition-colors">
            Start chatting
          </Link>
        </div>
        <div className="pt-8 flex justify-center">
          <div className="inline-flex items-center justify-center rounded-full border-2 border-[#C1442D] text-[#C1442D] w-16 h-16 -rotate-12 font-[family-name:var(--font-mono)] text-[10px] font-bold leading-none">
            <span>GROUNDED<br/>[1]</span>
          </div>
        </div>
      </div>
    </div>
  );
}