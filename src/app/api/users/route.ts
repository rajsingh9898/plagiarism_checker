import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (session?.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            _count: {
                select: { scans: true }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(users);
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, role } = await req.json();
    if (!id || !role) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const user = await prisma.user.update({
        where: { id },
        data: { role }
    });

    return NextResponse.json(user);
}
