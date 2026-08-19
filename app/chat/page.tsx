import { getDocuments } from "@/actions/documents";
import ChatWindow from "@/components/chat-window";
import CompareView from "@/components/compare-view";

type ChatPageProps = {
  searchParams: Promise<{
    mode?: string;
  }>;
};

export default async function ChatPage({
  searchParams,
}: ChatPageProps) {
  const documents = await getDocuments();

  const { mode } = await searchParams;

  const compareMode = mode === "compare";

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          {compareMode ? "Compare documents" : "Ask your documents"}
        </h1>

        <div className="flex gap-2 text-sm">
          <a
            href="/chat"
            className={`px-3 py-1 rounded ${
              !compareMode
                ? "bg-[#C1442D]"
                : "border border-[#A98F5A]/40"
            }`}
          >
            Ask
          </a>

          <a
            href="/chat?mode=compare"
            className={`px-3 py-1 rounded ${
              compareMode
                ? "bg-[#C1442D]"
                : "border border-[#A98F5A]/40"
            }`}
          >
            Compare
          </a>
        </div>
      </div>

      {compareMode ? (
        <CompareView documents={documents} />
      ) : (
        <ChatWindow documents={documents} />
      )}
    </div>
  );
}