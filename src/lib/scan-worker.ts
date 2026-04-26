import { prisma } from "@/lib/prisma";
import { runPipeline } from "@/lib/pipeline";
import { detectAiContent, detectAiContentWithGemini } from "@/lib/ai-detector";
import { geminiAnalyzePlagiarism } from "@/lib/gemini";
import { buildSemanticSummary, analyzeCitationQuality, buildWritingImprovements, buildSourceIntelligence } from "@/lib/advanced-analysis";
import { createTextFingerprint, createVerificationCode } from "@/lib/fingerprint";

async function recordEvent(jobId: string, stage: string, status: string, message: string, metricMs?: number) {
  await prisma.scanJobEvent.create({
    data: { jobId, stage, status, message, metricMs },
  });
}

async function updateJob(jobId: string, data: { stage?: string; progress?: number; status?: string; error?: string | null; scanId?: string | null; startedAt?: Date | null; completedAt?: Date | null; attempts?: number; }) {
  await prisma.scanJob.update({
    where: { id: jobId },
    data,
  });
}

async function refreshBatch(batchId: string) {
  const jobs = await prisma.scanJob.findMany({ where: { batchId }, select: { status: true } });
  const completedJobs = jobs.filter((j) => j.status === "completed").length;
  const failedJobs = jobs.filter((j) => j.status === "failed").length;

  let status = "processing";
  if (failedJobs + completedJobs === jobs.length) {
    status = failedJobs > 0 ? "completed_with_errors" : "completed";
  }

  await prisma.batchScan.update({
    where: { id: batchId },
    data: {
      completedJobs,
      failedJobs,
      status,
      summaryJson: JSON.stringify({
        completedJobs,
        failedJobs,
        totalJobs: jobs.length,
      }),
    },
  });
}

function buildScanResponse(scan: any) {
  const extra = scan.analysisJson ? JSON.parse(scan.analysisJson) : {};
  const matches = (scan.matches || []).map((m: any) => {
    let parsedRanges: any[] = [];
    try {
      parsedRanges = JSON.parse(m.matchRanges || "[]");
    } catch {
      parsedRanges = [];
    }

    return {
      sourceDocumentId: m.sourceDocumentId,
      sourceName: m.sourceDocument?.name || "Unknown source",
      sourceType: m.sourceDocument?.name ? undefined : "Unknown",
      matchPercentage: m.matchPercentage,
      matchRanges: parsedRanges,
    };
  });

  return {
    scanId: scan.id,
    similarityScore: scan.similarityScore,
    originalityScore: scan.originalityScore,
    semanticScore: scan.semanticScore,
    citationScore: scan.citationScore,
    writingScore: scan.writingScore,
    status: scan.status,
    stage: scan.stage,
    progress: scan.progress,
    shareableCode: scan.shareableCode,
    matches,
    ...extra,
  };
}

export async function getScanResponseById(scanId: string) {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: {
      matches: {
        include: { sourceDocument: true },
      },
    },
  });

  if (!scan) {
    return null;
  }

  return buildScanResponse(scan);
}

export async function processScanJob(jobId: string): Promise<void> {
  const job = await prisma.scanJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  if (job.status === "processing" || job.status === "completed") {
    return;
  }

  const startedAt = Date.now();
  await updateJob(jobId, {
    status: "processing",
    stage: "preprocessing",
    progress: 5,
    startedAt: new Date(),
    attempts: job.attempts + 1,
    error: null,
  });
  await recordEvent(jobId, "preprocessing", "running", "Scan job started");

  try {
    const rawText = job.payloadText;
    const fingerprint = job.fingerprint || createTextFingerprint(rawText);

    await updateJob(jobId, { progress: 12, stage: "dedup" });
    await recordEvent(jobId, "dedup", "running", "Checking duplicate fingerprints");

    const reusedScan = await prisma.scan.findFirst({
      where: {
        userId: job.userId,
        fingerprint,
        status: "COMPLETED",
      },
      include: { matches: true },
      orderBy: { createdAt: "desc" },
    });

    if (reusedScan) {
      const copied = await prisma.scan.create({
        data: {
          userId: job.userId,
          text: reusedScan.text,
          wordCount: reusedScan.wordCount,
          similarityScore: reusedScan.similarityScore,
          originalityScore: reusedScan.originalityScore,
          semanticScore: reusedScan.semanticScore,
          citationScore: reusedScan.citationScore,
          writingScore: reusedScan.writingScore,
          status: "COMPLETED",
          stage: "report",
          progress: 100,
          fingerprint,
          isReused: true,
          analysisJson: reusedScan.analysisJson,
          shareableCode: createVerificationCode(jobId, new Date()),
          batchId: job.batchId,
          workspaceId: job.workspaceId,
          matches: {
            create: reusedScan.matches.map((m) => ({
              sourceDocumentId: m.sourceDocumentId,
              matchPercentage: m.matchPercentage,
              matchRanges: m.matchRanges,
            })),
          },
        },
      });

      await updateJob(jobId, {
        status: "completed",
        stage: "report",
        progress: 100,
        scanId: copied.id,
        completedAt: new Date(),
      });
      await recordEvent(jobId, "report", "done", "Reused recent duplicate scan", Date.now() - startedAt);

      if (job.batchId) {
        await refreshBatch(job.batchId);
      }
      return;
    }

    await updateJob(jobId, { stage: "matching", progress: 26 });
    const sourceStart = Date.now();
    const dbSources = await prisma.sourceDocument.findMany({
      select: { id: true, name: true, text: true },
    });
    await recordEvent(jobId, "matching", "running", `Loaded ${dbSources.length} sources`, Date.now() - sourceStart);

    const pipelineStart = Date.now();
    const pipelineResult = await runPipeline(rawText, dbSources, {
      ignoreQuotes: true,
      ignoreReferences: true,
      ignoreBoilerplate: true,
      boilerplateTemplates: [],
    });

    await updateJob(jobId, { stage: "semantic", progress: 52 });
    await recordEvent(jobId, "matching", "done", `Verified ${pipelineResult.sources.length} matches`, Date.now() - pipelineStart);

    const semanticSummary = buildSemanticSummary(rawText, pipelineResult.sources);
    const citationSummary = analyzeCitationQuality(rawText, pipelineResult.sources);
    const writingSummary = buildWritingImprovements(rawText, pipelineResult);
    const sourceIntelligence = buildSourceIntelligence(pipelineResult.sources);

    const lightweightMode = pipelineResult.sources.length === 0 || pipelineResult.overallSimilarity < 4;

    await updateJob(jobId, { stage: "ai", progress: 68 });
    const aiStart = Date.now();
    const matchedSourceSnippets = pipelineResult.sources.slice(0, 5).map((s) => ({
      name: s.sourceName,
      snippet: s.matchRanges[0]?.sourceSnippet || "",
    }));

    const [aiResult, geminiPlagiarismResult] = await Promise.allSettled([
      lightweightMode ? Promise.resolve(detectAiContent(rawText)) : detectAiContentWithGemini(rawText),
      lightweightMode ? Promise.resolve(null) : geminiAnalyzePlagiarism(rawText, matchedSourceSnippets),
    ]);

    const aiDetection = aiResult.status === "fulfilled"
      ? aiResult.value
      : detectAiContent(rawText);

    const paraphraseAnalysis = geminiPlagiarismResult.status === "fulfilled"
      ? geminiPlagiarismResult.value
      : null;

    await recordEvent(jobId, "ai", "done", lightweightMode ? "Fast heuristic path" : "Full AI analysis", Date.now() - aiStart);

    await updateJob(jobId, { stage: "report", progress: 86 });

    const scan = await prisma.scan.create({
      data: {
        userId: job.userId,
        text: rawText,
        wordCount: rawText.trim().split(/\s+/).filter(Boolean).length,
        similarityScore: pipelineResult.overallSimilarity,
        originalityScore: pipelineResult.originalityScore,
        semanticScore: semanticSummary.score,
        citationScore: citationSummary.score,
        writingScore: writingSummary.score,
        status: "COMPLETED",
        stage: "report",
        progress: 100,
        fingerprint,
        shareableCode: createVerificationCode(jobId, new Date()),
        batchId: job.batchId,
        workspaceId: job.workspaceId,
        analysisJson: JSON.stringify({
          sectionScores: pipelineResult.sectionScores,
          matchTypeSummary: pipelineResult.matchTypeSummary,
          commonPhrasesFound: pipelineResult.commonPhrasesFound,
          excludedChars: pipelineResult.excludedChars,
          totalChars: pipelineResult.totalChars,
          pipelineStages: pipelineResult.pipelineStages,
          aiDetection,
          paraphraseAnalysis,
          semanticSummary,
          citationSummary,
          writingSummary,
          sourceIntelligence,
        }),
        matches: {
          create: pipelineResult.sources.map((s) => ({
            sourceDocumentId: s.sourceId,
            matchPercentage: s.adjustedScore,
            matchRanges: JSON.stringify(s.matchRanges),
          })),
        },
      },
    });

    await updateJob(jobId, {
      status: "completed",
      stage: "report",
      progress: 100,
      scanId: scan.id,
      completedAt: new Date(),
    });
    await recordEvent(jobId, "report", "done", "Scan complete", Date.now() - startedAt);

    if (job.batchId) {
      await refreshBatch(job.batchId);
    }
  } catch (error: any) {
    await updateJob(jobId, {
      status: "failed",
      stage: "failed",
      error: error?.message || "Unknown error",
      progress: 100,
      completedAt: new Date(),
    });
    await recordEvent(jobId, "failed", "failed", error?.message || "Unknown error", Date.now() - startedAt);

    if (job.batchId) {
      await refreshBatch(job.batchId);
    }
  }
}

export async function processNextQueuedJob() {
  const nextJob = await prisma.scanJob.findFirst({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
  });

  if (!nextJob) {
    return { processed: false };
  }

  await processScanJob(nextJob.id);
  return { processed: true, jobId: nextJob.id };
}
