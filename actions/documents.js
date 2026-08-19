"use server";

import { db } from "@/lib/prisma";
import { extractTextFromFile } from "@/lib/extract-text";
import { chunkText, embedText } from "@/lib/embeddings";
import { groq } from "@/lib/groq";

export async function ingestDocument(formData) {
  const file = formData.get("file");

  if (!file) {
    throw new Error("No file provided");
  }

  const title = formData.get("title") || file.name;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Extract text from PDF / DOCX / TXT
  const text = await extractTextFromFile(buffer, file.name);

  // Split document into chunks
  const chunks = chunkText(text);

  // Generate AI summary
  const summary = await summarizeDocument(text);

  // Create document record
  const document = await db.document.create({
    data: {
      title,
      fileName: file.name,
      summary,
    },
  });

  // Generate embeddings and store chunks
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embedText(chunks[i]);
    const vectorStr = `[${embedding.join(",")}]`;

    await db.$executeRaw`
      INSERT INTO "Chunk"
        (id, "documentId", content, "chunkIndex", embedding, "createdAt")
      VALUES
        (
          gen_random_uuid()::text,
          ${document.id},
          ${chunks[i]},
          ${i},
          ${vectorStr}::vector,
          now()
        )
    `;
  }

  return {
    id: document.id,
    title: document.title,
    chunkCount: chunks.length,
  };
}


// Generate a short AI summary for the uploaded document
async function summarizeDocument(text) {
  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content:
          "Summarize this document in one plain sentence, under 20 words. No preamble, no markdown.",
      },
      {
        role: "user",
        content: text.slice(0, 6000),
      },
    ],
  });

  return completion.choices[0].message.content.trim();
}


// Get all documents
// Used by dashboard and chat page
export async function getDocuments() {
  const documents = await db.document.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          chunks: true,
        },
      },
    },
  });

  return documents.map((document) => ({
    id: document.id,
    title: document.title,
    fileName: document.fileName,
    summary: document.summary,
    createdAt: document.createdAt,
    chunkCount: document._count.chunks,
  }));
}


// Get one document
// Used by app/documents/[documentId]/page.tsx
export async function getDocument(documentId) {
  return db.document.findUnique({
    where: {
      id: documentId,
    },
    include: {
      chunks: {
        orderBy: {
          chunkIndex: "asc",
        },
      },
    },
  });
}


// Delete one document
export async function deleteDocument(documentId) {
  await db.document.delete({
    where: {
      id: documentId,
    },
  });
}