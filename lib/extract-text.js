import { extractText } from "unpdf";
import mammoth from "mammoth";

export async function extractTextFromFile(buffer, fileName) {
  const ext = fileName.split(".").pop().toLowerCase();

  if (ext === "pdf") {
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
    return text;
  }
  if (ext === "docx") {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  if (ext === "txt") {
    return buffer.toString("utf-8");
  }
  throw new Error(`Unsupported file type: .${ext}`);
}