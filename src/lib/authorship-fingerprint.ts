/**
 * Authorship / Writing-Style Fingerprint Engine
 * Computes style metrics per text to detect consistency and style shifts.
 */

export interface StyleMetrics {
  sentenceLengths: number[];
  avgSentenceLength: number;
  sentenceLengthStdDev: number;
  shortSentenceRatio: number;  // <10 words
  longSentenceRatio: number;   // >30 words

  // Vocabulary
  vocabularyRichness: number;  // type-token ratio
  uniqueWords: number;
  totalWords: number;
  avgWordLength: number;
  complexWordRatio: number;    // words > 6 chars

  // Punctuation habits
  commasPerSentence: number;
  semicolonsPerSentence: number;
  exclamationRatio: number;
  questionRatio: number;
  dashRatio: number;

  // Readability (Flesch-like)
  readabilityScore: number;

  // Phrase patterns
  transitionalPhraseCount: number;
  passiveVoiceEstimate: number;  // rough estimate
  contractionCount: number;
}

export interface StyleShift {
  sectionA: string;
  sectionB: string;
  confidence: number;  // 0-100
  explanation: string;
  metrics: string[];   // which metrics shifted
}

export interface AuthorProfile {
  overallMetrics: StyleMetrics;
  sectionMetrics: { section: string; metrics: StyleMetrics }[];
  shifts: StyleShift[];
  consistency: number; // 0-100
}

// ── Helpers ──
function getSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 3);
}

function getWords(text: string): string[] {
  return text.toLowerCase().match(/\b[a-z']+\b/g) || [];
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((acc, v) => acc + (v - mean) ** 2, 0) / arr.length);
}

const TRANSITIONAL_PHRASES = [
  "however", "therefore", "moreover", "furthermore", "consequently",
  "nevertheless", "in addition", "for example", "in contrast",
  "on the other hand", "as a result", "in conclusion", "specifically",
  "indeed", "similarly", "meanwhile", "subsequently", "thus",
];

const PASSIVE_INDICATORS = [
  "was ", "were ", "been ", "being ", "is being", "was being",
  "has been", "have been", "had been", "will be", "will have been",
];

// ── Core: compute style metrics ──
export function computeStyleMetrics(text: string): StyleMetrics {
  const sentences = getSentences(text);
  const words = getWords(text);
  const uniqueWords = new Set(words);

  const sentenceLengths = sentences.map((s) => getWords(s).length);
  const avgSentenceLength = sentenceLengths.length ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length : 0;

  const shortCount = sentenceLengths.filter((l) => l < 10).length;
  const longCount = sentenceLengths.filter((l) => l > 30).length;

  const avgWordLength = words.length ? words.reduce((a, w) => a + w.length, 0) / words.length : 0;
  const complexWords = words.filter((w) => w.length > 6).length;

  // Punctuation
  const commas = (text.match(/,/g) || []).length;
  const semicolons = (text.match(/;/g) || []).length;
  const exclamations = (text.match(/!/g) || []).length;
  const questions = (text.match(/\?/g) || []).length;
  const dashes = (text.match(/[—–-]{2,}|—/g) || []).length;

  const sc = Math.max(sentences.length, 1);

  // Transitional phrases
  const lowerText = text.toLowerCase();
  const transitionalCount = TRANSITIONAL_PHRASES.reduce((acc, p) => {
    return acc + (lowerText.split(p).length - 1);
  }, 0);

  // Passive voice estimate
  const passiveCount = PASSIVE_INDICATORS.reduce((acc, p) => {
    return acc + (lowerText.split(p).length - 1);
  }, 0);

  // Contractions
  const contractions = (text.match(/\b\w+'\w+\b/g) || []).length;

  // Readability (simplified Flesch)
  const syllableEstimate = words.reduce((a, w) => a + Math.max(1, Math.floor(w.length / 3)), 0);
  const readability = Math.max(0, Math.min(100,
    206.835 - 1.015 * (words.length / sc) - 84.6 * (syllableEstimate / Math.max(words.length, 1))
  ));

  return {
    sentenceLengths,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    sentenceLengthStdDev: Math.round(stdDev(sentenceLengths) * 10) / 10,
    shortSentenceRatio: Math.round((shortCount / sc) * 100),
    longSentenceRatio: Math.round((longCount / sc) * 100),
    vocabularyRichness: words.length ? Math.round((uniqueWords.size / words.length) * 100) / 100 : 0,
    uniqueWords: uniqueWords.size,
    totalWords: words.length,
    avgWordLength: Math.round(avgWordLength * 10) / 10,
    complexWordRatio: Math.round((complexWords / Math.max(words.length, 1)) * 100),
    commasPerSentence: Math.round((commas / sc) * 10) / 10,
    semicolonsPerSentence: Math.round((semicolons / sc) * 10) / 10,
    exclamationRatio: Math.round((exclamations / sc) * 100),
    questionRatio: Math.round((questions / sc) * 100),
    dashRatio: Math.round((dashes / sc) * 100),
    readabilityScore: Math.round(readability),
    transitionalPhraseCount: transitionalCount,
    passiveVoiceEstimate: passiveCount,
    contractionCount: contractions,
  };
}

// ── Detect style shifts between sections ──
export function detectStyleShifts(sections: { name: string; text: string }[]): StyleShift[] {
  const shifts: StyleShift[] = [];
  const sectionMetrics = sections.map((s) => ({
    name: s.name,
    metrics: computeStyleMetrics(s.text),
  }));

  for (let i = 0; i < sectionMetrics.length - 1; i++) {
    const a = sectionMetrics[i];
    const b = sectionMetrics[i + 1];
    const shiftedMetrics: string[] = [];
    let totalShift = 0;

    // Compare key metrics
    const checks: [string, number, number, number][] = [
      ["Avg sentence length", a.metrics.avgSentenceLength, b.metrics.avgSentenceLength, 5],
      ["Vocabulary richness", a.metrics.vocabularyRichness * 100, b.metrics.vocabularyRichness * 100, 10],
      ["Complex word ratio", a.metrics.complexWordRatio, b.metrics.complexWordRatio, 10],
      ["Commas per sentence", a.metrics.commasPerSentence, b.metrics.commasPerSentence, 1],
      ["Readability", a.metrics.readabilityScore, b.metrics.readabilityScore, 15],
      ["Short sentence %", a.metrics.shortSentenceRatio, b.metrics.shortSentenceRatio, 20],
      ["Passive voice usage", a.metrics.passiveVoiceEstimate, b.metrics.passiveVoiceEstimate, 3],
    ];

    checks.forEach(([label, valA, valB, threshold]) => {
      const diff = Math.abs(valA - valB);
      if (diff > threshold) {
        shiftedMetrics.push(label);
        totalShift += diff / threshold;
      }
    });

    if (shiftedMetrics.length > 0) {
      const confidence = Math.min(95, Math.round(totalShift * 15));
      const direction = a.metrics.readabilityScore > b.metrics.readabilityScore ? "more complex" : "simpler";

      shifts.push({
        sectionA: a.name,
        sectionB: b.name,
        confidence,
        explanation: `Writing style shifts to ${direction} language. Changes detected in: ${shiftedMetrics.join(", ")}.`,
        metrics: shiftedMetrics,
      });
    }
  }

  return shifts;
}

// ── Build full author profile ──
export function buildAuthorProfile(text: string): AuthorProfile {
  const overallMetrics = computeStyleMetrics(text);

  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 30);
  const sections = paragraphs.map((p, i) => ({
    name: `Section ${i + 1}`,
    text: p.trim(),
  }));

  const sectionMetrics = sections.map((s) => ({
    section: s.name,
    metrics: computeStyleMetrics(s.text),
  }));

  const shifts = detectStyleShifts(sections);

  // Consistency: 100 - (number of shifts * severity)
  const consistency = Math.max(0, Math.round(100 - shifts.reduce((acc, s) => acc + s.confidence * 0.5, 0)));

  return { overallMetrics, sectionMetrics, shifts, consistency };
}
