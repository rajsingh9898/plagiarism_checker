import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTextFingerprint } from "@/lib/fingerprint";
import { processScanJob } from "@/lib/scan-worker";

const pdfParse = require("pdf-parse");
import mammoth from "mammoth";

async function extractRawTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    const data = await pdfParse(buffer);
    return data.text || "";
  }

  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  if (ext === "txt") {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type for ${file.name}`);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let items: { text: string; fileName: string }[] = [];
  let name: string | null = null;

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    name = String(formData.get("name") || "").trim() || null;
    const files = formData.getAll("files") as File[];

    const extracted: { text: string; fileName: string }[] = [];
    for (const file of files) {
      if (!file || !file.name) continue;
      const rawText = await extractRawTextFromFile(file);
      extracted.push({ text: rawText, fileName: file.name });
    }
    items = extracted;
  } else {
    const body = await req.json();
    name = typeof body?.name === "string" ? body.name : null;
    const parsed = Array.isArray(body?.items) ? body.items : [];
    items = parsed.map((item: any, idx: number) => ({
      text: typeof item?.text === "string" ? item.text.trim() : "",
      fileName: typeof item?.fileName === "string" ? item.fileName : `batch-${idx + 1}.txt`,
    }));
  }

  const validItems = items.filter((item) => item.text.split(/\s+/).filter(Boolean).length >= 50);

  if (validItems.length === 0) {
    return NextResponse.json({ error: "No valid items (minimum 50 words each)." }, { status: 400 });
  }

  const batch = await prisma.batchScan.create({
    data: {
      userId: session.user.id,
      name: name || undefined,
      totalJobs: validItems.length,
      status: "queued",
    },
  });

  const jobs = [];
  for (const item of validItems) {
    const job = await prisma.scanJob.create({
      data: {
        userId: session.user.id,
        batchId: batch.id,
        payloadText: item.text,
        fileName: item.fileName,
        fingerprint: createTextFingerprint(item.text),
      },
      select: {
        id: true,
        fileName: true,
      },
    });
    jobs.push(job);
  }

  await prisma.batchScan.update({ where: { id: batch.id }, data: { status: "processing" } });

  for (const job of jobs) {
    void processScanJob(job.id);
  }

  return NextResponse.json({
    batchId: batch.id,
    status: "processing",
    totalJobs: validItems.length,
    jobs,
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batches = await prisma.batchScan.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      jobs: {
        select: {
          id: true,
          status: true,
          progress: true,
          fileName: true,
          scanId: true,
          error: true,
        },
      },
    },
  });

  return NextResponse.json(batches);
}
