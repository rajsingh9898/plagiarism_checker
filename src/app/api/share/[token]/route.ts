import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const share = await prisma.sharedReport.findUnique({
    where: { token: params.token },
    include: {
      scan: {
        include: {
          matches: {
            include: { sourceDocument: true },
          },
          user: {
            select: { name: true, email: true },
          },
        },
      },
    },
  });

  if (!share || share.revoked) {
    return NextResponse.json({ error: "Shared report not found" }, { status: 404 });
  }

  if (share.expiresAt && new Date() > share.expiresAt) {
    return NextResponse.json({ error: "Shared report expired" }, { status: 410 });
  }

  const scan = share.scan;
  let analysis: any = {};
  try {
    analysis = scan.analysisJson ? JSON.parse(scan.analysisJson) : {};
  } catch {
    analysis = {};
  }

  return NextResponse.json({
    report: {
      token: share.token,
      verifyCode: share.verifyCode,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
      scanId: scan.id,
      scanCreatedAt: scan.createdAt,
      author: scan.user.name || scan.user.email,
      similarityScore: scan.similarityScore,
      originalityScore: scan.originalityScore,
      semanticScore: scan.semanticScore,
      citationScore: scan.citationScore,
      writingScore: scan.writingScore,
      sourceCount: scan.matches.length,
      sourceIntelligence: analysis.sourceIntelligence || [],
    },
  });
}
