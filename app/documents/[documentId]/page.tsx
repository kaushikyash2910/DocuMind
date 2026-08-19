import { getDocument } from "@/actions/documents";
import { notFound } from "next/navigation";

type DocumentPageProps = {
  params: Promise<{
    documentId: string;
  }>;
};

export default async function DocumentPage({
  params,
}: DocumentPageProps) {
  const { documentId } = await params;

  const document = await getDocument(documentId);

  if (!document) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {document.title}
        </h1>

        <p className="text-sm text-gray-500">
          {document.chunks.length} chunks
        </p>
      </div>

      <div className="space-y-4">
      {document.chunks.map((chunk: typeof document.chunks[number]) => (
          <div
            key={chunk.id}
            id={`chunk-${chunk.id}`}
            className="border rounded-lg p-4 text-sm transition-shadow"
          >
            <p className="text-xs text-gray-400 mb-2">
              Chunk {chunk.chunkIndex + 1}
            </p>

            <p>{chunk.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}