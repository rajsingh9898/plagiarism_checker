import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [jobs24h, failures24h, avgTiming, stageCounts, recentErrors] = await Promise.all([
    prisma.scanJob.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    prisma.scanJob.count({ where: { status: "failed", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    prisma.scanJobEvent.aggregate({
      _avg: { metricMs: true },
      where: { metricMs: { not: null }, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.scanJobEvent.groupBy({
      by: ["stage"],
      _count: { stage: true },
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.scanJob.findMany({
      where: { status: "failed" },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        error: true,
        stage: true,
        updatedAt: true,
        fileName: true,
      },
    }),
  ]);

  return NextResponse.json({
    jobs24h,
    failures24h,
    failureRate: jobs24h > 0 ? Math.round((failures24h / jobs24h) * 1000) / 10 : 0,
    avgStageTimeMs: Math.round(avgTiming._avg.metricMs || 0),
    stageCounts: stageCounts.map((s) => ({ stage: s.stage, count: s._count.stage })),
    recentErrors,
  });
}
