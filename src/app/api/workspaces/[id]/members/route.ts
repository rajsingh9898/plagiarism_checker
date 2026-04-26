import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function canManageWorkspace(workspaceId: string, userId: string) {
  const workspace = await prisma.teamWorkspace.findUnique({ where: { id: workspaceId } });
  return !!workspace && workspace.ownerId === userId;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canManage = await canManageWorkspace(params.id, session.user.id);
  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const email = String(body?.email || "").trim().toLowerCase();
  const role = String(body?.role || "STUDENT").toUpperCase();

  if (!email) {
    return NextResponse.json({ error: "Member email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const member = await prisma.teamMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: params.id,
        userId: user.id,
      },
    },
    update: { role },
    create: {
      workspaceId: params.id,
      userId: user.id,
      role,
    },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  });

  return NextResponse.json(member);
}
