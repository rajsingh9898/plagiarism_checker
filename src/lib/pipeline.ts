/**
 * VerifyIQ — Multi-Stage Detection Pipeline
 * 
 * Stage A: Preprocess (normalize, detect language, strip quotes/references/boilerplate)
 * Stage B: Candidate retrieval (shingling + MinHash for fast near-duplicate detection)
 * Stage C: Verification (fuzzy alignment + LCS for precise highlight ranges)
 * Stage D: Scoring & explanation (match classification, common-phrase down-weighting)
 */

// ═══════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════

export type MatchType = "exact" | "near" | "paraphrase" | "common_phrase";

export interface TextChunk {
  idx: number;
  text: string;
  startChar: number;
  endChar: number;
  language: string;
  isQuote: boolean;
  isReference: boolean;
  isBoilerplate: boolean;
  excluded: boolean;
}

export interface MatchRange {
  start: number;
  end: number;
  matchType: MatchType;
  confidence: number; // 0-100
  sourceSnippet: string;
}

export interface SourceMatch {
  sourceId: string;
  sourceName: string;
  sourceType: "Journal" | "University" | "News" | "Blog" | "Forum" | "Unknown";
  overallScore: number;
  matchRanges: MatchRange[];
  matchTypes: Record<MatchType, number>;
  rawScore: number;      // before down-weighting
  adjustedScore: number; // after down-weighting
}

export interface PipelineResult {
  chunks: TextChunk[];
  sources: SourceMatch[];
  overallSimilarity: number;
  originalityScore: number;
  sectionScores: { section: string; similarity: number; startChar: number; endChar: number }[];
  matchTypeSummary: Record<MatchType, number>;
  commonPhrasesFound: string[];
  excludedChars: number;
  totalChars: number;
  pipelineStages: PipelineStage[];
}

export interface PipelineStage {
  name: string;
  status: "pending" | "running" | "done";
  timeMs: number;
  detail: string;
}

// ═══════════════════════════════════════
//  COMMON PHRASES (down-weight these)
// ═══════════════════════════════════════

const COMMON_PHRASES = [
  "in this paper we", "the results show that", "it is important to note",
  "in conclusion", "as a result", "on the other hand", "in other words",
  "for example", "in addition to", "according to", "with respect to",
  "it has been shown", "the purpose of this study", "in the context of",
  "based on the results", "further research is needed", "it can be concluded",
  "the findings suggest", "as shown in", "the data indicates",
  "it is well known", "the main purpose", "in recent years",
  "there is a growing", "this suggests that", "it should be noted",
  "as mentioned above", "the following section", "in the present study",
  "these results suggest", "this paper presents", "we can see that",
];

// ═══════════════════════════════════════
//  STAGE A: PREPROCESSING
// ═══════════════════════════════════════

export function detectLanguage(text: string): string {
  // Heuristic language detection based on character ranges + common words
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  const hasChinese = /[\u4E00-\u9FFF]/.test(text);
  const hasHindi = /[\u0900-\u097F]/.test(text);
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
  const hasKorean = /[\uAC00-\uD7AF]/.test(text);
  const hasCyrillic = /[\u0400-\u04FF]/.test(text);

  if (hasChinese) return "zh";
  if (hasJapanese) return "ja";
  if (hasKorean) return "ko";
  if (hasArabic) return "ar";
  if (hasHindi) return "hi";
  if (hasCyrillic) return "ru";

  // Check for European languages via common words
  const lower = text.toLowerCase();
  if (/\b(der|die|das|und|ist|nicht)\b/.test(lower)) return "de";
  if (/\b(le|la|les|est|sont|dans|une)\b/.test(lower)) return "fr";
  if (/\b(el|la|los|las|es|por|una)\b/.test(lower)) return "es";
  if (/\b(il|la|di|che|non|per|una)\b/.test(lower)) return "it";
  if (/\b(o|a|os|as|de|em|não)\b/.test(lower)) return "pt";

  return "en";
}

function isQuotedText(text: string): boolean {
  return /^["«»\u201C\u201D'][\s\S]*["«»\u201C\u201D']$/.test(text.trim()) || /^["']/.test(text.trim());
}

function isReferenceSection(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return /^(references|bibliography|works cited|sources|citations)[\s:$]/m.test(lower);
}

export function preprocessText(
  rawText: string,
  boilerplateTemplates: string[] = []
): TextChunk[] {
  const chunks: TextChunk[] = [];
  // Split into sentences for fine-grained analysis
  function getSentences(text: string): string[] {
  return text.split(/[.!?]\s+/).filter((s) => s.trim().length > 3);
}  
  const sentences = getSentences(rawText);
  
  let charOffset = 0;
  let inReferenceSection = false;

  sentences.forEach((sentence, idx) => {
    const startChar = rawText.indexOf(sentence, charOffset);
    const endChar = startChar + sentence.length;
    charOffset = endChar;

    if (isReferenceSection(sentence)) inReferenceSection = true;

    const isQuote = isQuotedText(sentence);
    const isRef = inReferenceSection;
    const isBoilerplate = boilerplateTemplates.some((t) =>
      sentence.toLowerCase().includes(t.toLowerCase())
    );

    chunks.push({
      idx,
      text: sentence,
      startChar,
      endChar,
      language: detectLanguage(sentence),
      isQuote,
      isReference: isRef,
      isBoilerplate,
      excluded: isQuote || isRef || isBoilerplate,
    });
  });

  return chunks;
}

// ═══════════════════════════════════════
//  STAGE B: CANDIDATE RETRIEVAL
//  (Shingling + MinHash + Jaccard)
// ═══════════════════════════════════════

function normalizeForComparison(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function getWordShingles(text: string, n: number = 5): string[] {
  const words = normalizeForComparison(text).split(" ");
  if (words.length < n) return [words.join(" ")];
  const shingles: string[] = [];
  for (let i = 0; i <= words.length - n; i++) {
    shingles.push(words.slice(i, i + n).join(" "));
  }
  return shingles;
}

function getCharShingles(text: string, n: number = 15): string[] {
  const norm = normalizeForComparison(text);
  if (norm.length < n) return [norm];
  const shingles: string[] = [];
  for (let i = 0; i <= norm.length - n; i++) {
    shingles.push(norm.substring(i, i + n));
  }
  return shingles;
}

// Simple hash for MinHash
function simpleHash(str: string, seed: number): number {
  let hash = seed;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0; // unsigned
}

function computeMinHash(shingles: string[], numHashes: number = 64): number[] {
  const signature: number[] = new Array(numHashes).fill(Infinity);
  for (const shingle of shingles) {
    for (let h = 0; h < numHashes; h++) {
      const hashVal = simpleHash(shingle, h * 1000 + 7);
      if (hashVal < signature[h]) signature[h] = hashVal;
    }
  }
  return signature;
}

function estimateJaccardFromMinHash(sigA: number[], sigB: number[]): number {
  let matches = 0;
  for (let i = 0; i < sigA.length; i++) {
    if (sigA[i] === sigB[i]) matches++;
  }
  return matches / sigA.length;
}

function exactJaccard(shinglesA: string[], shinglesB: string[]): number {
  if (!shinglesA.length || !shinglesB.length) return 0;
  const setA = new Set(shinglesA);
  const setB = new Set(shinglesB);
  let intersection = 0;
  const items = Array.from(setA);
  for (const item of items) { if (setB.has(item)) intersection++; }
  return intersection / (setA.size + setB.size - intersection);
}

export interface CandidateSource {
  id: string;
  name: string;
  text: string;
  estimatedSimilarity: number;
}

export function retrieveCandidates(
  userText: string,
  sources: { id: string; name: string; text: string }[],
  threshold: number = 0.01
): CandidateSource[] {
  const userShingles = getWordShingles(userText, 5);
  const userMinHash = computeMinHash(userShingles);

  const candidates: CandidateSource[] = [];

  for (const source of sources) {
    const sourceShingles = getWordShingles(source.text, 5);
    const sourceMinHash = computeMinHash(sourceShingles);
    const estimated = estimateJaccardFromMinHash(userMinHash, sourceMinHash);

    if (estimated > threshold) {
      candidates.push({
        ...source,
        estimatedSimilarity: estimated,
      });
    }
  }

  // Sort by estimated similarity descending
  candidates.sort((a, b) => b.estimatedSimilarity - a.estimatedSimilarity);
  return candidates;
}

// ═══════════════════════════════════════
//  STAGE C: VERIFICATION
//  (Precise alignment + LCS + fuzzy)
// ═══════════════════════════════════════

function longestCommonSubsequence(a: string[], b: string[]): number {
  const m = a.length, n = b.length;
  // Optimize: use 1D array for space efficiency
  const prev = new Array(n + 1).fill(0);
  const curr = new Array(n + 1).fill(0);
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    for (let j = 0; j <= n; j++) { prev[j] = curr[j]; curr[j] = 0; }
  }
  return prev[n];
}

function classifyMatch(
  userChunk: string,
  sourceChunk: string,
  jaccardScore: number,
  lcsRatio: number
): { type: MatchType; confidence: number } {
  const normUser = normalizeForComparison(userChunk);
  const normSource = normalizeForComparison(sourceChunk);

  // Check if it's a common phrase
  const isCommon = COMMON_PHRASES.some((p) => normUser.includes(p) && normSource.includes(p));
  if (isCommon && jaccardScore < 0.4) {
    return { type: "common_phrase", confidence: 40 + Math.round(jaccardScore * 60) };
  }

  // Exact match
  if (normUser === normSource || jaccardScore > 0.9) {
    return { type: "exact", confidence: 95 };
  }

  // Near match (high Jaccard overlap)
  if (jaccardScore > 0.5 || lcsRatio > 0.7) {
    return { type: "near", confidence: 70 + Math.round(jaccardScore * 25) };
  }

  // Paraphrase (moderate overlap)
  if (jaccardScore > 0.15 || lcsRatio > 0.4) {
    return { type: "paraphrase", confidence: 40 + Math.round(lcsRatio * 50) };
  }

  return { type: "common_phrase", confidence: 20 };
}

export function verifyAndAlign(
  chunks: TextChunk[],
  candidate: CandidateSource,
  rawText: string
): SourceMatch {
  const sourceType = inferSourceType(candidate.name);
  const sourceShingles = getWordShingles(candidate.text, 5);
  const matchRanges: MatchRange[] = [];
  const matchTypes: Record<MatchType, number> = { exact: 0, near: 0, paraphrase: 0, common_phrase: 0 };
  let totalMatchedChars = 0;

  for (const chunk of chunks) {
    if (chunk.excluded) continue;

    const chunkShingles = getWordShingles(chunk.text, 5);
    const jaccard = exactJaccard(chunkShingles, sourceShingles);

    if (jaccard > 0.05) {
      // Run LCS for precision
      const chunkWords = normalizeForComparison(chunk.text).split(" ");
      const sourceWords = normalizeForComparison(candidate.text).split(" ");
      const lcsLen = longestCommonSubsequence(
        chunkWords.slice(0, 100),  // limit for perf
        sourceWords.slice(0, 500)
      );
      const lcsRatio = chunkWords.length > 0 ? lcsLen / chunkWords.length : 0;

      const { type, confidence } = classifyMatch(chunk.text, candidate.text, jaccard, lcsRatio);
      matchTypes[type]++;

      // Find exact position in sourceText for snippet
      const sourceSnippet = candidate.text.substring(0, Math.min(candidate.text.length, 120));

      matchRanges.push({
        start: chunk.startChar,
        end: chunk.endChar,
        matchType: type,
        confidence,
        sourceSnippet,
      });

      totalMatchedChars += chunk.endChar - chunk.startChar;
    }
  }

  const rawScore = rawText.length > 0 ? (totalMatchedChars / rawText.length) * 100 : 0;

  // Down-weight common phrases
  const commonPhraseChars = matchRanges
    .filter((r) => r.matchType === "common_phrase")
    .reduce((acc, r) => acc + (r.end - r.start), 0);
  const adjustedMatchedChars = totalMatchedChars - commonPhraseChars * 0.7; // 70% reduction
  const adjustedScore = rawText.length > 0 ? Math.max(0, (adjustedMatchedChars / rawText.length) * 100) : 0;

  return {
    sourceId: candidate.id,
    sourceName: candidate.name,
    sourceType,
    overallScore: adjustedScore,
    matchRanges,
    matchTypes,
    rawScore,
    adjustedScore,
  };
}

function inferSourceType(name: string): SourceMatch["sourceType"] {
  const n = name.toLowerCase();
  if (n.includes("journal") || n.includes("arxiv") || n.includes("doi")) return "Journal";
  if (n.includes("edu") || n.includes("university") || n.includes("thesis")) return "University";
  if (n.includes("news") || n.includes("times") || n.includes("post")) return "News";
  if (n.includes("blog") || n.includes("medium") || n.includes("wordpress")) return "Blog";
  if (n.includes("forum") || n.includes("reddit") || n.includes("stack")) return "Forum";
  return "Unknown";
}

// ═══════════════════════════════════════
//  STAGE D: SCORING & EXPLANATION
// ═══════════════════════════════════════

export function computeFinalScores(
  rawText: string,
  chunks: TextChunk[],
  sourceMatches: SourceMatch[]
): PipelineResult {
  // Merge all match ranges
  const allRanges = sourceMatches.flatMap((s) => s.matchRanges);

  // Calculate overall similarity
  const mergedRanges = mergeOverlapping(allRanges.map((r) => ({ start: r.start, end: r.end })));
  const totalMatchedChars = mergedRanges.reduce((acc, r) => acc + (r.end - r.start), 0);
  const excludedChars = chunks.filter((c) => c.excluded).reduce((acc, c) => acc + (c.endChar - c.startChar), 0);
  const effectiveLength = rawText.length - excludedChars;

  // Down-weight common phrases from overall score
  const commonPhraseChars = allRanges
    .filter((r) => r.matchType === "common_phrase")
    .reduce((acc, r) => acc + (r.end - r.start), 0);
  const adjustedMatched = Math.max(0, totalMatchedChars - commonPhraseChars * 0.7);
  const overallSimilarity = effectiveLength > 0
    ? Math.min(100, (adjustedMatched / effectiveLength) * 100)
    : 0;

  // Section scores (paragraph-level)
  const paragraphs = rawText.split(/\n{2,}/).filter((p) => p.trim().length > 10);
  let offset = 0;
  const sectionScores = paragraphs.map((para, i) => {
    const startChar = rawText.indexOf(para, offset);
    const endChar = startChar + para.length;
    offset = endChar;

    const sectionMatchChars = mergedRanges
      .filter((r) => r.start < endChar && r.end > startChar)
      .reduce((acc, r) => acc + Math.max(0, Math.min(r.end, endChar) - Math.max(r.start, startChar)), 0);
    const similarity = para.length > 0 ? Math.min(100, (sectionMatchChars / para.length) * 100) : 0;

    return { section: `Section ${i + 1}`, similarity: Math.round(similarity * 10) / 10, startChar, endChar };
  });

  // Match type summary
  const matchTypeSummary: Record<MatchType, number> = { exact: 0, near: 0, paraphrase: 0, common_phrase: 0 };
  allRanges.forEach((r) => matchTypeSummary[r.matchType]++);

  // Common phrases found
  const commonPhrasesFound = COMMON_PHRASES.filter((p) => rawText.toLowerCase().includes(p));

  return {
    chunks,
    sources: sourceMatches,
    overallSimilarity: Math.round(overallSimilarity * 10) / 10,
    originalityScore: Math.round((100 - overallSimilarity) * 10) / 10,
    sectionScores,
    matchTypeSummary,
    commonPhrasesFound,
    excludedChars,
    totalChars: rawText.length,
    pipelineStages: [],
  };
}

function mergeOverlapping(ranges: { start: number; end: number }[]): { start: number; end: number }[] {
  if (!ranges.length) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) last.end = Math.max(last.end, sorted[i].end);
    else merged.push({ ...sorted[i] });
  }
  return merged;
}

// ═══════════════════════════════════════
//  FULL PIPELINE ORCHESTRATOR
// ═══════════════════════════════════════

export async function runPipeline(
  rawText: string,
  dbSources: { id: string; name: string; text: string }[],
  options: {
    boilerplateTemplates?: string[];
    ignoreQuotes?: boolean;
    ignoreReferences?: boolean;
    ignoreBoilerplate?: boolean;
  } = {}
): Promise<PipelineResult> {
  const stages: PipelineStage[] = [];
  const {
    boilerplateTemplates = [],
    ignoreQuotes = true,
    ignoreReferences = true,
    ignoreBoilerplate = true,
  } = options;

  // STAGE A: Preprocess
  const stageAStart = Date.now();
  const chunks = preprocessText(rawText, boilerplateTemplates);

  // Apply ignore rules
  chunks.forEach((c) => {
    c.excluded = false;
    if (ignoreQuotes && c.isQuote) c.excluded = true;
    if (ignoreReferences && c.isReference) c.excluded = true;
    if (ignoreBoilerplate && c.isBoilerplate) c.excluded = true;
  });

  stages.push({
    name: "Preprocess",
    status: "done",
    timeMs: Date.now() - stageAStart,
    detail: `${chunks.length} chunks, ${chunks.filter((c) => c.excluded).length} excluded`,
  });

  // STAGE B: Candidate Retrieval
  const stageBStart = Date.now();
  const activeText = chunks.filter((c) => !c.excluded).map((c) => c.text).join(" ");
  const candidates = retrieveCandidates(activeText, dbSources, 0.005);
  stages.push({
    name: "Candidate Retrieval",
    status: "done",
    timeMs: Date.now() - stageBStart,
    detail: `${candidates.length} candidates from ${dbSources.length} sources`,
  });

  // STAGE C: Verification
  const stageCStart = Date.now();
  const sourceMatches: SourceMatch[] = [];
  for (const candidate of candidates) {
    const match = verifyAndAlign(chunks, candidate, rawText);
    if (match.matchRanges.length > 0) {
      sourceMatches.push(match);
    }
  }
  stages.push({
    name: "Verification",
    status: "done",
    timeMs: Date.now() - stageCStart,
    detail: `${sourceMatches.length} verified matches`,
  });

  // STAGE D: Scoring
  const stageDStart = Date.now();
  const result = computeFinalScores(rawText, chunks, sourceMatches);
  result.pipelineStages = stages;
  stages.push({
    name: "Scoring",
    status: "done",
    timeMs: Date.now() - stageDStart,
    detail: `Similarity: ${result.overallSimilarity}%, ${Object.values(result.matchTypeSummary).reduce((a, b) => a + b, 0)} match ranges`,
  });

  return result;
}
