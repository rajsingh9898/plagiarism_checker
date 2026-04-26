import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTextFingerprint } from "@/lib/fingerprint";
import { extractTextFromFormData, validateInputText } from "@/lib/text-input";
import { processScanJob } from "@/lib/scan-worker";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const { rawText, fileName } = await extractTextFromFormData(formData);
    const validation = validateInputText(rawText);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const workspaceId = (formData.get("workspaceId") as string | null) || null;
    const fingerprint = createTextFingerprint(rawText);

    const job = await prisma.scanJob.create({
      data: {
        userId: session.user.id,
        payloadText: rawText,
        fileName: fileName || undefined,
        fingerprint,
        workspaceId: workspaceId || undefined,
      },
      select: {
        id: true,
        status: true,
        stage: true,
        progress: true,
        createdAt: true,
      },
    });

    // Fire-and-forget worker execution for real-time progress polling.
    void processScanJob(job.id);

    return NextResponse.json({
      message: "Scan job queued",
      job,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to queue scan" }, { status: 400 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await prisma.scanJob.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      status: true,
      stage: true,
      progress: true,
      createdAt: true,
      completedAt: true,
      fileName: true,
      scanId: true,
      error: true,
    },
  });

  return NextResponse.json(jobs);
}
