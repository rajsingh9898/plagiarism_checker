import type { PipelineResult, SourceMatch } from "@/lib/pipeline";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function cosineSimilarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.length === 0 || tb.length === 0) return 0;

  const fa = new Map<string, number>();
  const fb = new Map<string, number>();
  ta.forEach((t) => fa.set(t, (fa.get(t) || 0) + 1));
  tb.forEach((t) => fb.set(t, (fb.get(t) || 0) + 1));

  let dot = 0;
  let na = 0;
  let nb = 0;

  fa.forEach((v, k) => {
    na += v * v;
    dot += v * (fb.get(k) || 0);
  });
  fb.forEach((v) => {
    nb += v * v;
  });

  return na > 0 && nb > 0 ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

export interface SemanticSummary {
  score: number;
  multilingualSegments: number;
  paraphraseSignals: number;
  details: { sourceName: string; semanticScore: number; languageHint: string }[];
}

export function buildSemanticSummary(rawText: string, sources: SourceMatch[]): SemanticSummary {
  const details = sources.slice(0, 10).map((s) => {
    const avgSourceSnippet = s.matchRanges[0]?.sourceSnippet || "";
    const semantic = cosineSimilarity(rawText.slice(0, 2500), avgSourceSnippet.slice(0, 2500));
    const languageHint = /[\u0600-\u06FF\u0900-\u097F\u0400-\u04FF\u4E00-\u9FFF]/.test(avgSourceSnippet)
      ? "multilingual"
      : "latin";

    return {
      sourceName: s.sourceName,
      semanticScore: Math.round(semantic * 100),
      languageHint,
    };
  });

  const score = details.length
    ? Math.round(details.reduce((acc, d) => acc + d.semanticScore, 0) / details.length)
    : 0;

  const multilingualSegments = details.filter((d) => d.languageHint === "multilingual").length;
  const paraphraseSignals = sources.reduce((acc, s) => acc + (s.matchTypes.paraphrase || 0), 0);

  return { score, multilingualSegments, paraphraseSignals, details };
}

export interface CitationIssue {
  issue: string;
  severity: "low" | "medium" | "high";
  excerpt: string;
  recommendation: string;
}

export interface CitationSummary {
  score: number;
  styleHint: "APA" | "MLA" | "Chicago" | "Unknown";
  issues: CitationIssue[];
}

export function analyzeCitationQuality(rawText: string, sourceMatches: SourceMatch[]): CitationSummary {
  const issues: CitationIssue[] = [];
  const hasReferences = /(references|works cited|bibliography)/i.test(rawText);
  const quoteBlocks = (rawText.match(/"[\s\S]*?"/g) || []).length;
  const citationTokens = (rawText.match(/\(([^)]+,\s*\d{4}|[^)]+\s+\d{4})\)|\[[0-9]+\]/g) || []).length;

  if (!hasReferences && sourceMatches.length > 0) {
    issues.push({
      issue: "Missing references section",
      severity: "high",
      excerpt: "No references or bibliography heading detected.",
      recommendation: "Add a references section with full source details.",
    });
  }

  if (quoteBlocks > 0 && citationTokens < quoteBlocks) {
    issues.push({
      issue: "Quoted text likely missing citation",
      severity: "high",
      excerpt: `Detected ${quoteBlocks} quoted segments but only ${citationTokens} inline citations.`,
      recommendation: "Add inline citations directly after quoted statements.",
    });
  }

  if (sourceMatches.length > 3 && citationTokens < 2) {
    issues.push({
      issue: "Low inline citation density",
      severity: "medium",
      excerpt: "Multiple matches were found but very few citation patterns.",
      recommendation: "Cite sources near paraphrased or matched claims.",
    });
  }

  const apa = /\([A-Z][A-Za-z\-]+,\s*\d{4}\)/.test(rawText);
  const mla = /\([A-Z][A-Za-z\-]+\s+\d+\)/.test(rawText);
  const chicago = /\d+\.\s+[A-Z][A-Za-z\-]+/.test(rawText);
  const styleHint: CitationSummary["styleHint"] = apa ? "APA" : mla ? "MLA" : chicago ? "Chicago" : "Unknown";

  const score = Math.max(0, 100 - issues.reduce((acc, i) => acc + (i.severity === "high" ? 30 : i.severity === "medium" ? 15 : 8), 0));

  return { score, styleHint, issues };
}

export interface WritingImprovementSummary {
  score: number;
  suggestions: { original: string; improved: string; reason: string; severity: "medium" | "high" }[];
}

export function buildWritingImprovements(rawText: string, pipelineResult: PipelineResult): WritingImprovementSummary {
  const suggestions: WritingImprovementSummary["suggestions"] = [];

  const riskySections = pipelineResult.sectionScores
    .filter((s) => s.similarity >= 20)
    .slice(0, 8);

  for (const section of riskySections) {
    const excerpt = rawText.slice(section.startChar, Math.min(section.endChar, section.startChar + 220)).trim();
    if (!excerpt) continue;

    const improved = excerpt
      .replace(/\b(very|really|basically|actually)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    suggestions.push({
      original: excerpt,
      improved,
      reason: "This section has elevated similarity. Rephrase sentence structure and add your own interpretation.",
      severity: section.similarity > 40 ? "high" : "medium",
    });
  }

  const score = Math.max(0, 100 - suggestions.length * 8);
  return { score, suggestions };
}

export interface SourceIntelligenceItem {
  sourceName: string;
  sourceType: string;
  category: "internal_corpus" | "academic" | "web_style" | "unknown";
  confidence: number;
  matchPercentage: number;
}

export function buildSourceIntelligence(sources: SourceMatch[]): SourceIntelligenceItem[] {
  return sources
    .slice(0, 10)
    .map((s) => {
      const confidences = s.matchRanges.map((r) => r.confidence || 0);
      const confidence = confidences.length
        ? Math.round(confidences.reduce((acc, c) => acc + c, 0) / confidences.length)
        : Math.round(Math.min(95, s.overallScore + 20));

      const sourceType = s.sourceType || "Unknown";
      const category: SourceIntelligenceItem["category"] = sourceType === "Journal" || sourceType === "University"
        ? "academic"
        : sourceType === "News" || sourceType === "Blog" || sourceType === "Forum"
          ? "web_style"
          : "internal_corpus";

      return {
        sourceName: s.sourceName,
        sourceType,
        category,
        confidence,
        matchPercentage: Math.round(s.adjustedScore * 10) / 10,
      };
    });
}
