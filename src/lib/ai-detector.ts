/**
 * AI Content Detector — Heuristic Engine
 *
 * Uses two main statistical features:
 * 1. Burstiness  – Variance in sentence length (humans = high, AI = low)
 * 2. Perplexity  – Vocabulary predictability proxy (humans = high, AI = low)
 *
 * Returns a probability 0–100 that the text is AI-generated.
 */

export interface AiDetectionResult {
  aiProbability: number;   // 0-100
  humanProbability: number; // 0-100
  burstiness: number;       // 0-100 (high = more human-like)
  perplexity: number;       // 0-100 (high = more human-like)
  verdict: "likely_human" | "mixed" | "likely_ai";
  sentenceCount: number;
  avgSentenceLength: number;
  vocabularyRichness: number; // unique/total ratio 0-1
}

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
 * Returns 0-100 score where 100 = very bursty/human-like.
 */
function calculateBurstiness(sentences: string[]): number {
  if (sentences.length < 3) return 50; // not enough data

  const lengths = sentences.map((s) => getWords(s).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  if (mean === 0) return 50;

  const variance = lengths.reduce((acc, l) => acc + (l - mean) ** 2, 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean; // coefficient of variation

  // Map CV 0..1+ to score 0..100
  // CV < 0.2 → low burstiness (AI-like), CV > 0.6 → high burstiness (human-like)
  const score = Math.min(100, Math.max(0, cv * 125));
  return Math.round(score);
}

/**
 * Perplexity proxy: vocabulary richness + sentence pattern diversity.
 * Uses type-token ratio + bigram diversity as a proxy for how "surprising" the text is.
 * Returns 0-100 where 100 = high perplexity / very human-like.
 */
function calculatePerplexity(text: string, sentences: string[]): number {
  const words = getWords(text);
  if (words.length < 10) return 50;

  // Type-Token Ratio (unique words / total words)
  const uniqueWords = new Set(words);
  const ttr = uniqueWords.size / words.length;

  // Bigram diversity
  const bigrams = new Set<string>();
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.add(words[i] + " " + words[i + 1]);
  }
  const bigramDiversity = bigrams.size / Math.max(1, words.length - 1);

  // Sentence-start diversity (do sentences start with different words?)
  const starters = new Set(sentences.map((s) => getWords(s)[0]).filter(Boolean));
  const starterDiversity = starters.size / Math.max(1, sentences.length);

  // Weighted combination
  const rawScore = ttr * 0.4 + bigramDiversity * 0.35 + starterDiversity * 0.25;

  // Map raw 0..1 → 0..100
  const score = Math.min(100, Math.max(0, rawScore * 130));
  return Math.round(score);
}

export function detectAiContent(inputText: string): AiDetectionResult {
  const sentences = splitSentences(inputText);
  const words = getWords(inputText);
  const uniqueWords = new Set(words);

  const burstiness = calculateBurstiness(sentences);
  const perplexity = calculatePerplexity(inputText, sentences);

  // Combine: low burstiness + low perplexity = likely AI
  // Weight burstiness slightly more (it's a stronger signal)
  const humanScore = burstiness * 0.55 + perplexity * 0.45;

  // Map humanScore (0-100) to AI probability
  const aiProbability = Math.round(Math.max(0, Math.min(100, 100 - humanScore)));
  const humanProbability = 100 - aiProbability;

  let verdict: "likely_human" | "mixed" | "likely_ai";
  if (aiProbability >= 65) verdict = "likely_ai";
  else if (aiProbability >= 35) verdict = "mixed";
  else verdict = "likely_human";

  return {
    aiProbability,
    humanProbability,
    burstiness,
    perplexity,
    verdict,
    sentenceCount: sentences.length,
    avgSentenceLength: sentences.length ? Math.round(words.length / sentences.length) : 0,
    vocabularyRichness: words.length ? +(uniqueWords.size / words.length).toFixed(3) : 0,
  };
}
