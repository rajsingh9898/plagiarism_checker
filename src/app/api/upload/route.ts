import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const pdfParse = require("pdf-parse");
import mammoth from "mammoth";
import { normalizeText } from "@/lib/plagiarism";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    let rawText = "";
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
        if (ext === "pdf") {
            const data = await pdfParse(buffer);
            rawText = data.text;
        } else if (ext === "docx") {
            const result = await mammoth.extractRawText({ buffer });
            rawText = result.value;
        } else if (ext === "txt") {
            rawText = buffer.toString("utf-8");
        } else {
            return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
        }

        const normalized = normalizeText(rawText);

        const doc = await prisma.sourceDocument.create({
            data: {
                name: file.name,
                text: normalized
            }
        });

        return NextResponse.json(doc);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (session?.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const docs = await prisma.sourceDocument.findMany({
        select: { id: true, name: true, uploadedAt: true }
    });

    return NextResponse.json(docs);
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    await prisma.sourceDocument.delete({ where: { id } });

    return NextResponse.json({ success: true });
}
