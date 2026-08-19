import { getDocuments } from "@/actions/documents";
import DocumentUpload from "@/components/document-upload";
import DocumentList from "@/components/document-list";

export default async function DashboardPage() {
  const documents = await getDocuments();

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">
      <header className="space-y-2">
        <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.2em] uppercase text-[#A98F5A]">
          The Archive
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold">Your documents</h1>
        <p className="text-[#A98F5A]/100 text-sm">
          Every file here is searchable — ask anything, and answers come back grounded in what's actually inside them.
        </p>
      </header>
      <DocumentUpload />
      <DocumentList documents={documents} selectedIds={undefined} onToggle={undefined} />
    </div>
  );
}