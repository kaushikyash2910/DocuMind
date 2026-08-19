import { db } from "@/lib/prisma";
import { embedText } from "@/lib/embeddings";

export async function retrieveChunks(query, documentIds, topK = 5) {
  const queryEmbedding = await embedText(query);
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  return db.$queryRaw`
    SELECT c.id, c.content, c."documentId", d.title,
           1 - (c.embedding <=> ${vectorStr}::vector) AS similarity
    FROM "Chunk" c
    JOIN "Document" d ON d.id = c."documentId"
    WHERE c."documentId" = ANY(${documentIds})
    ORDER BY c.embedding <=> ${vectorStr}::vector
    LIMIT ${topK}
  `;
}