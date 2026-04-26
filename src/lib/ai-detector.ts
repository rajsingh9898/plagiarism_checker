/**
 * AI Content Detector — Hybrid Engine
 *
 * Combines two analysis methods:
 * 1. Heuristic Engine (fast, local, always available):
 *    - Burstiness: Variance in sentence length (humans = high, AI = low)
 *    - Perplexity: Vocabulary predictability proxy (humans = high, AI = low)
 *
 * 2. Gemini AI Engine (accurate, API-powered):
 *    - Deep semantic analysis of writing patterns
 *    - Signal detection: transitions, hedging, uniformity
 *    - Falls back gracefully if API is unavailable
 *
 * Returns a combined result with probability 0–100 that text is AI-generated.
 */

export interface AiDetectionResult {
  aiProbability: number;      // 0-100
  humanProbability: number;   // 0-100
  burstiness: number;         // 0-100 (high = more human-like)
  perplexity: number;         // 0-100 (high = more human-like)
  verdict: "likely_human" | "mixed" | "likely_ai";
  sentenceCount: number;
  avgSentenceLength: number;
  vocabularyRichness: number; // unique/total ratio 0-1
  // Gemini-enhanced fields
  geminiVerdict?: "likely_human" | "mixed" | "likely_ai";
  geminiConfidence?: number;
  geminiReasoning?: string;
  aiSignals?: string[];
  humanSignals?: string[];
  keyFindings?: string[];
  analysisMethod: "heuristic" | "gemini_hybrid";
}

// ═══════════════════════════════════════
//  HEURISTIC ENGINE
// ═══════════════════════════════════════

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

function getWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Burstiness: coefficient of variation of sentence lengths.
 * Human text typically has CV > 0.5; AI text is more uniform (CV < 0.3).
 */
function calculateBurstiness(sentences: string[]): number {
  if (sentences.length < 3) return 50;

  const lengths = sentences.map((s) => getWords(s).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  if (mean === 0) return 50;

  const variance = lengths.reduce((acc, l) => acc + (l - mean) ** 2, 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;

  const score = Math.min(100, Math.max(0, cv * 125));
  return Math.round(score);
}

/**
 * Perplexity proxy: vocabulary richness + sentence pattern diversity.
 */
function calculatePerplexity(text: string, sentences: string[]): number {
  const words = getWords(text);
  if (words.length < 10) return 50;

  const uniqueWords = new Set(words);
  const ttr = uniqueWords.size / words.length;

  const bigrams = new Set<string>();
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.add(words[i] + " " + words[i + 1]);
  }
  const bigramDiversity = bigrams.size / Math.max(1, words.length - 1);

  const starters = new Set(sentences.map((s) => getWords(s)[0]).filter(Boolean));
  const starterDiversity = starters.size / Math.max(1, sentences.length);

  const rawScore = ttr * 0.4 + bigramDiversity * 0.35 + starterDiversity * 0.25;
  const score = Math.min(100, Math.max(0, rawScore * 130));
  return Math.round(score);
}

function runHeuristicDetection(inputText: string) {
  const sentences = splitSentences(inputText);
  const words = getWords(inputText);
  const uniqueWords = new Set(words);

  const burstiness = calculateBurstiness(sentences);
  const perplexity = calculatePerplexity(inputText, sentences);

  const humanScore = burstiness * 0.55 + perplexity * 0.45;
  const aiProbability = Math.round(Math.max(0, Math.min(100, 100 - humanScore)));

  return {
    aiProbability,
    humanProbability: 100 - aiProbability,
    burstiness,
    perplexity,
    sentenceCount: sentences.length,
    avgSentenceLength: sentences.length ? Math.round(words.length / sentences.length) : 0,
    vocabularyRichness: words.length ? +(uniqueWords.size / words.length).toFixed(3) : 0,
  };
}

// ═══════════════════════════════════════
//  HEURISTIC-ONLY EXPORT (for fast paths)
// ═══════════════════════════════════════

export function detectAiContent(inputText: string): AiDetectionResult {
  const h = runHeuristicDetection(inputText);

  let verdict: AiDetectionResult["verdict"];
  if (h.aiProbability >= 65) verdict = "likely_ai";
  else if (h.aiProbability >= 35) verdict = "mixed";
  else verdict = "likely_human";

  return {
    ...h,
    verdict,
    analysisMethod: "heuristic",
  };
}

// ═══════════════════════════════════════
//  GEMINI HYBRID EXPORT (for full analysis)
// ═══════════════════════════════════════

export async function detectAiContentWithGemini(inputText: string): Promise<AiDetectionResult> {
  const h = runHeuristicDetection(inputText);

  try {
    // Dynamic import to avoid issues if module isn't loaded
    const { geminiDetectAI } = await import("./gemini");
    const g = await geminiDetectAI(inputText);

    // Weighted blend: Gemini 70%, Heuristic 30%
    const blendedAiProbability = Math.round(g.aiProbability * 0.7 + h.aiProbability * 0.3);
    const blendedHumanProbability = 100 - blendedAiProbability;

    let verdict: AiDetectionResult["verdict"];
    if (blendedAiProbability >= 65) verdict = "likely_ai";
    else if (blendedAiProbability >= 35) verdict = "mixed";
    else verdict = "likely_human";

    return {
      aiProbability: blendedAiProbability,
      humanProbability: blendedHumanProbability,
      burstiness: h.burstiness,
      perplexity: h.perplexity,
      verdict,
      sentenceCount: h.sentenceCount,
      avgSentenceLength: h.avgSentenceLength,
      vocabularyRichness: h.vocabularyRichness,
      geminiVerdict: g.verdict,
      geminiConfidence: g.confidence,
      geminiReasoning: g.reasoning,
      aiSignals: g.aiSignals,
      humanSignals: g.humanSignals,
      keyFindings: g.keyFindings,
      analysisMethod: "gemini_hybrid",
    };
  } catch (err) {
    console.warn("[AI Detector] Gemini unavailable, falling back to heuristics:", err);
    return detectAiContent(inputText);
  }
}
