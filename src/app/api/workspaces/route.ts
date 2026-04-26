import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaces = await prisma.teamWorkspace.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      members: {
        select: {
          userId: true,
          role: true,
          user: { select: { name: true, email: true } },
        },
      },
      assignments: true,
    },
  });

  return NextResponse.json(workspaces);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = String(body?.name || "").trim();
  const description = String(body?.description || "").trim();

  if (!name) {
    return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
  }

  const workspace = await prisma.teamWorkspace.create({
    data: {
      name,
      description: description || undefined,
      ownerId: session.user.id,
      members: {
        create: {
          userId: session.user.id,
          role: "TEACHER",
        },
      },
    },
    include: {
      members: true,
    },
  });

  return NextResponse.json(workspace, { status: 201 });
}
