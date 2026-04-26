const pdfParse = require("pdf-parse");
import mammoth from "mammoth";

export interface ExtractedInput {
  rawText: string;
  fileName?: string;
}

export async function extractTextFromFormData(formData: FormData): Promise<ExtractedInput> {
  const file = formData.get("file") as File | null;
  const textInput = formData.get("text") as string | null;

  if (file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "pdf") {
      const data = await pdfParse(buffer);
      return { rawText: data.text || "", fileName: file.name };
    }

    if (ext === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      return { rawText: result.value || "", fileName: file.name };
    }

    if (ext === "txt") {
      return { rawText: buffer.toString("utf-8"), fileName: file.name };
    }

    throw new Error("Unsupported file type. Use .txt, .pdf, or .docx");
  }

  if (textInput && textInput.trim().length > 0) {
    return { rawText: textInput };
  }

  throw new Error("No text or file provided");
}

export function validateInputText(rawText: string): { ok: boolean; error?: string; wordCount: number } {
  const wordCount = rawText.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 50) {
    return { ok: false, error: "Text must be at least 50 words.", wordCount };
  }
  return { ok: true, wordCount };
}
