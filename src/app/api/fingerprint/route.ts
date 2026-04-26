import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { geminiAuthorshipAnalysis } from "@/lib/gemini";
import { buildAuthorProfile } from "@/lib/authorship-fingerprint";

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
        if (wordCount < 50) {
            return NextResponse.json({ error: "Please provide at least 50 words for authorship analysis." }, { status: 400 });
        }

        // Run statistical analysis + Gemini deep analysis in parallel
        const [statisticalProfile, geminiResult] = await Promise.allSettled([
            Promise.resolve(buildAuthorProfile(text)),
            geminiAuthorshipAnalysis(text),
        ]);

        const statistical = statisticalProfile.status === "fulfilled"
            ? statisticalProfile.value
            : null;

        const gemini = geminiResult.status === "fulfilled"
            ? geminiResult.value
            : null;

        return NextResponse.json({ statistical, gemini });
    } catch (error: any) {
        console.error("[Fingerprint API] Error:", error);
        return NextResponse.json({ error: error.message || "Authorship analysis failed." }, { status: 500 });
    }
}
