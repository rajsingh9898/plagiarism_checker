import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { geminiWritingCoach } from "@/lib/gemini";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { text } = body;

        if (!text || typeof text !== "string") {
            return NextResponse.json({ error: "No text provided." }, { status: 400 });
        }

        const wordCount = text.trim().split(/\s+/).length;
        if (wordCount < 20) {
            return NextResponse.json({ error: "Please provide at least 20 words for writing feedback." }, { status: 400 });
        }

        const result = await geminiWritingCoach(text);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("[Coach API] Error:", error);
        return NextResponse.json({ error: error.message || "Writing coach analysis failed." }, { status: 500 });
    }
}
