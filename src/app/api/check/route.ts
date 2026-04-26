import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTextFingerprint } from "@/lib/fingerprint";
import { extractTextFromFormData, validateInputText } from "@/lib/text-input";
import { processScanJob, getScanResponseById } from "@/lib/scan-worker";

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

    const job = await prisma.scanJob.create({
      data: {
        userId: session.user.id,
        payloadText: rawText,
        fileName: fileName || undefined,
        fingerprint: createTextFingerprint(rawText),
      },
    });

    // Compatibility mode: run synchronously for legacy endpoints.
    await processScanJob(job.id);

    const finalJob = await prisma.scanJob.findUnique({
      where: { id: job.id },
      select: { status: true, error: true, scanId: true },
    });

    if (!finalJob || finalJob.status !== "completed" || !finalJob.scanId) {
      return NextResponse.json({ error: finalJob?.error || "Scan failed" }, { status: 500 });
    }

    const result = await getScanResponseById(finalJob.scanId);
    if (!result) {
      return NextResponse.json({ error: "Scan result unavailable" }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Scan failed" }, { status: 400 });
  }
}
