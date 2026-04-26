import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scans = await prisma.scan.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: {
            id: true,
            text: true,
            similarityScore: true,
            originalityScore: true,
            semanticScore: true,
            citationScore: true,
            writingScore: true,
            status: true,
            stage: true,
            progress: true,
            wordCount: true,
            createdAt: true,
        },
    });

    return NextResponse.json(scans);
}
