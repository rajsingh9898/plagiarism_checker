import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createShareToken, createVerificationCode } from "@/lib/fingerprint";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scan = await prisma.scan.findUnique({ where: { id: params.id } });
  if (!scan || scan.userId !== session.user.id) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const expiresInDays = Number(body?.expiresInDays || 30);
  const expiresAt = Number.isFinite(expiresInDays)
    ? new Date(Date.now() + Math.max(1, Math.min(365, expiresInDays)) * 24 * 60 * 60 * 1000)
    : null;

  const token = createShareToken();
  const verifyCode = createVerificationCode(scan.id, scan.createdAt);

  const share = await prisma.sharedReport.create({
    data: {
      token,
      scanId: scan.id,
      createdById: session.user.id,
      verifyCode,
      expiresAt: expiresAt || undefined,
    },
  });

  return NextResponse.json({
    token: share.token,
    verifyCode: share.verifyCode,
    expiresAt: share.expiresAt,
    shareUrl: `/share/${share.token}`,
  });
}
