import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScanResponseById } from "@/lib/scan-worker";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await prisma.scanJob.findUnique({
    where: { id: params.id },
    include: {
      events: {
        orderBy: { createdAt: "asc" },
        take: 40,
      },
    },
  });

  if (!job || job.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = job.scanId ? await getScanResponseById(job.scanId) : null;

  return NextResponse.json({
    id: job.id,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    scanId: job.scanId,
    error: job.error,
    fileName: job.fileName,
    events: job.events,
    result,
  });
}
