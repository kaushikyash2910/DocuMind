import { getDocuments } from "@/actions/documents";
import ChatWindow from "@/components/chat-window";
import CompareView from "@/components/compare-view";
import ResearchView from "@/components/research-view";

type ChatPageProps = { searchParams: Promise<{ mode?: string; q?: string }> };

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const documents = await getDocuments();
  const { mode, q } = await searchParams;
  const compareMode = mode === "compare";
  const researchMode = mode === "research";

  const titles = { compare: "Compare documents", research: "Research (multi-agent)", ask: "Ask your documents" };
  const title = compareMode ? titles.compare : researchMode ? titles.research : titles.ask;

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">{title}</h1>
        <div className="flex gap-2 text-sm font-[family-name:var(--font-mono)]">
          <a href="/chat" className={`px-4 py-1.5 rounded transition-colors ${!compareMode && !researchMode ? "bg-[#C1442D] text-[#F7F3E9]" : "border border-[#A98F5A]/40 text-[#F7F3E9]/70"}`}>Ask</a>
          <a href="/chat?mode=compare" className={`px-4 py-1.5 rounded transition-colors ${compareMode ? "bg-[#C1442D] text-[#F7F3E9]" : "border border-[#A98F5A]/40 text-[#F7F3E9]/70"}`}>Compare</a>
          <a href="/chat?mode=research" className={`px-4 py-1.5 rounded transition-colors ${researchMode ? "bg-[#C1442D] text-[#F7F3E9]" : "border border-[#A98F5A]/40 text-[#F7F3E9]/70"}`}>Research</a>
        </div>
      </div>
      {compareMode ? <CompareView documents={documents} /> : researchMode ? <ResearchView documents={documents} /> : <ChatWindow documents={documents} initialQuestion={q} />}
    </div>
  );
}