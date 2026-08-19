import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function embedText(text) {
  const result = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: { outputDimensionality: 768 }, // matches the schema above
  });
  return result.embeddings[0].values;
}

// Word-based chunking — good enough for v1. Token-based is more precise
// but adds a dependency; revisit only if retrieval quality feels off.
export function chunkText(text, size = 800, overlap = 100) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += size - overlap) {
    chunks.push(words.slice(i, i + size).join(" "));
  }
  return chunks;
}