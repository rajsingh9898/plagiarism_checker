import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
const pdfParse = require("pdf-parse");
import mammoth from "mammoth";
import { runPipeline } from "@/lib/pipeline";
import { detectAiContentWithGemini } from "@/lib/ai-detector";
import { geminiAnalyzePlagiarism } from "@/lib/gemini";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let rawText = "";

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const textInput = formData.get("text") as string | null;

    if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.split('.').pop()?.toLowerCase();
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
    } else if (textInput) {
        rawText = textInput;
    } else {
        return NextResponse.json({ error: "No text or file provided" }, { status: 400 });
    }

    const wordCount = rawText.trim().split(/\s+/).length;
    if (wordCount < 50) {
        return NextResponse.json({ error: "Text must be at least 50 words." }, { status: 400 });
    }

    // Fetch all corpus sources
    const dbSources = await prisma.sourceDocument.findMany({
        select: { id: true, name: true, text: true },
    });

    // Run the multi-stage pipeline (shingling + MinHash)
    const pipelineResult = await runPipeline(rawText, dbSources, {
        ignoreQuotes: true,
        ignoreReferences: true,
        ignoreBoilerplate: true,
        boilerplateTemplates: [],
    });

    // Run Gemini AI Detection + Gemini Plagiarism analysis in parallel
    const matchedSourceSnippets = pipelineResult.sources.slice(0, 5).map((s) => ({
        name: s.sourceName,
        snippet: s.matchRanges[0]?.sourceSnippet || "",
    }));

    const [aiResult, geminiPlagiarismResult] = await Promise.allSettled([
        detectAiContentWithGemini(rawText),
        geminiAnalyzePlagiarism(rawText, matchedSourceSnippets),
    ]);

    const aiDetection = aiResult.status === "fulfilled"
        ? aiResult.value
        : { aiProbability: 50, humanProbability: 50, verdict: "mixed", analysisMethod: "heuristic" };

    const paraphraseAnalysis = geminiPlagiarismResult.status === "fulfilled"
        ? geminiPlagiarismResult.value
        : null;

    // Save scan to DB
    const scan = await prisma.scan.create({
        data: {
            userId: session.user.id,
            text: rawText,
            wordCount,
            similarityScore: pipelineResult.overallSimilarity,
            originalityScore: pipelineResult.originalityScore,
            matches: {
                create: pipelineResult.sources.map((s) => ({
                    sourceDocumentId: s.sourceId,
                    matchPercentage: s.adjustedScore,
                    matchRanges: JSON.stringify(s.matchRanges),
                })),
            },
        },
    });

    return NextResponse.json({
        scanId: scan.id,
        similarityScore: pipelineResult.overallSimilarity,
        originalityScore: pipelineResult.originalityScore,
        matches: pipelineResult.sources.map((s) => ({
            sourceDocumentId: s.sourceId,
            sourceName: s.sourceName,
            sourceType: s.sourceType,
            matchPercentage: s.adjustedScore,
            rawScore: s.rawScore,
            adjustedScore: s.adjustedScore,
            matchRanges: s.matchRanges,
            matchTypes: s.matchTypes,
        })),
        sectionScores: pipelineResult.sectionScores,
        matchTypeSummary: pipelineResult.matchTypeSummary,
        commonPhrasesFound: pipelineResult.commonPhrasesFound,
        excludedChars: pipelineResult.excludedChars,
        totalChars: pipelineResult.totalChars,
        pipelineStages: pipelineResult.pipelineStages,
        aiDetection,
        paraphraseAnalysis,
    });
}
