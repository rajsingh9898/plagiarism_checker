import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function canAccessWorkspace(workspaceId: string, userId: string) {
  const workspace = await prisma.teamWorkspace.findFirst({
    where: {
      id: workspaceId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
  });
  return !!workspace;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canAccess = await canAccessWorkspace(params.id, session.user.id);
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assignments = await prisma.assignment.findMany({
    where: { workspaceId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assignments);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await prisma.teamWorkspace.findUnique({ where: { id: params.id } });
  if (!workspace || workspace.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const title = String(body?.title || "").trim();
  const description = String(body?.description || "").trim();
  const deadline = body?.deadline ? new Date(body.deadline) : null;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const assignment = await prisma.assignment.create({
    data: {
      workspaceId: params.id,
      title,
      description: description || undefined,
      deadline: deadline || undefined,
    },
  });

  return NextResponse.json(assignment, { status: 201 });
}
