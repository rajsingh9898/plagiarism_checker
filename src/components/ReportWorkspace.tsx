"use client";

import { useState, useRef, useEffect, useMemo } from "react";

/* ── Types ── */
type MatchType = "exact" | "near" | "paraphrase" | "common_phrase";
type MatchRange = { start: number; end: number; matchType?: MatchType; confidence?: number; sourceSnippet?: string };
type MatchData = {
  sourceName: string;
  sourceDocumentId: string;
  matchPercentage: number;
  matchRanges: MatchRange[];
  sourceType?: string;
  matchTypes?: Record<MatchType, number>;
  rawScore?: number;
  adjustedScore?: number;
};

type Section = {
  id: string;
  title: string;
  startIdx: number;
  endIdx: number;
  text: string;
  similarity: number;
  matchRanges: MatchRange[];
};

type SourceCard = {
  name: string;
  matchPercentage: number;
  type: "Journal" | "University" | "News" | "Blog" | "Forum" | "Unknown";
  access: "Public" | "Paywalled";
  region: string;
};

interface ReportWorkspaceProps {
  text: string;
  matches: MatchData[];
  similarityScore: number;
  originalityScore: number;
  matchTypeSummary?: Record<MatchType, number>;
  commonPhrasesFound?: string[];
  pipelineStages?: { name: string; status: string; timeMs: number; detail: string }[];
  aiDetection?: {
    aiProbability: number;
    humanProbability: number;
    burstiness: number;
    perplexity: number;
    verdict: string;
    sentenceCount: number;
    avgSentenceLength: number;
    vocabularyRichness: number;
  };
}

/* ── Helpers ── */
function inferSourceType(name: string): SourceCard["type"] {
  const n = name.toLowerCase();
  if (n.includes("journal") || n.includes("arxiv") || n.includes("doi")) return "Journal";
  if (n.includes("edu") || n.includes("university") || n.includes("thesis")) return "University";
  if (n.includes("news") || n.includes("times") || n.includes("post")) return "News";
  if (n.includes("blog") || n.includes("medium") || n.includes("wordpress")) return "Blog";
  if (n.includes("forum") || n.includes("reddit") || n.includes("stack")) return "Forum";
  return "Unknown";
}

const typeBadgeColors: Record<string, string> = {
  Journal: "bg-purple-100 text-purple-700",
  University: "bg-blue-100 text-blue-700",
  News: "bg-amber-100 text-amber-700",
  Blog: "bg-green-100 text-green-700",
  Forum: "bg-orange-100 text-orange-700",
  Unknown: "bg-slate-100 text-slate-600",
};

function mergeRanges(ranges: MatchRange[]): MatchRange[] {
  if (!ranges.length) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: MatchRange[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) last.end = Math.max(last.end, sorted[i].end);
    else merged.push({ ...sorted[i] });
  }
  return merged;
}

function splitIntoSections(text: string, allRanges: MatchRange[]): Section[] {
  // Split by double newline or sentences in batches of ~3 sentences
  const paragraphs = text.split(/\n{2,}/);
  const sections: Section[] = [];
  let currentIdx = 0;

  paragraphs.forEach((para, pi) => {
    if (para.trim().length < 5) { currentIdx += para.length + 2; return; }
    const startIdx = text.indexOf(para, currentIdx);
    const endIdx = startIdx + para.length;

    // Find matching ranges within this section
    const sectionRanges = allRanges.filter(
      (r) => r.start < endIdx && r.end > startIdx
    ).map((r) => ({
      start: Math.max(r.start, startIdx) - startIdx,
      end: Math.min(r.end, endIdx) - startIdx,
    }));

    const matchedChars = sectionRanges.reduce((acc, r) => acc + (r.end - r.start), 0);
    const similarity = para.length > 0 ? Math.round((matchedChars / para.length) * 100) : 0;

    sections.push({
      id: `section-${pi}`,
      title: para.substring(0, 50).trim() + (para.length > 50 ? "…" : ""),
      startIdx,
      endIdx,
      text: para,
      similarity,
      matchRanges: sectionRanges,
    });

    currentIdx = endIdx;
  });

  if (!sections.length) {
    sections.push({
      id: "section-0",
      title: text.substring(0, 50) + "…",
      startIdx: 0,
      endIdx: text.length,
      text,
      similarity: 0,
      matchRanges: [],
    });
  }

  return sections;
}

/* ── Main Component ── */
const matchTypeColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
  exact: { bg: "bg-red-200/70", text: "text-red-900", border: "border-red-400", label: "Exact" },
  near: { bg: "bg-orange-200/70", text: "text-orange-900", border: "border-orange-400", label: "Near" },
  paraphrase: { bg: "bg-amber-200/60", text: "text-amber-900", border: "border-amber-400", label: "Paraphrase" },
  common_phrase: { bg: "bg-slate-200/50", text: "text-slate-600", border: "border-slate-300", label: "Common" },
};

export default function ReportWorkspace({
  text,
  matches,
  similarityScore,
  originalityScore,
  matchTypeSummary,
  commonPhrasesFound,
  pipelineStages,
  aiDetection,
}: ReportWorkspaceProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"sources" | "rewrite" | "cite" | "ai">("sources");
  const [rewriteTone, setRewriteTone] = useState<"academic" | "simple" | "formal" | "creative">("academic");
  const [rewriteLevel, setRewriteLevel] = useState(50);
  const [rewriteResult, setRewriteResult] = useState("");
  const [citationStyle, setCitationStyle] = useState<"APA" | "MLA" | "Chicago">("APA");
  const centerRef = useRef<HTMLDivElement>(null);
  const heatmapRef = useRef<HTMLDivElement>(null);

  const allRanges = useMemo(() => mergeRanges(matches.flatMap((m) => m.matchRanges)), [matches]);
  const sections = useMemo(() => splitIntoSections(text, allRanges), [text, allRanges]);

  const sources: SourceCard[] = useMemo(
    () =>
      matches.map((m) => ({
        name: m.sourceName,
        matchPercentage: m.matchPercentage,
        type: inferSourceType(m.sourceName),
        access: Math.random() > 0.5 ? "Public" : "Paywalled",
        region: "en",
      })),
    [matches]
  );

  // Scroll to section
  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const el = document.getElementById(sectionId);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Jump to next match
  const jumpToNextMatch = () => {
    const currentIdx = sections.findIndex((s) => s.id === activeSection);
    for (let i = currentIdx + 1; i < sections.length; i++) {
      if (sections[i].similarity > 0) { scrollToSection(sections[i].id); return; }
    }
    for (let i = 0; i <= currentIdx; i++) {
      if (sections[i].similarity > 0) { scrollToSection(sections[i].id); return; }
    }
  };

  // Rewrite
  const handleRewrite = () => {
    if (!activeSection) return;
    const section = sections.find((s) => s.id === activeSection);
    if (!section) return;
    let rewritten = section.text;
    const synonymSets: Record<string, Record<string, string>> = {
      academic: { representation: "depiction", violation: "infringement", subject: "liable", considered: "regarded", sanctions: "disciplinary measures" },
      simple: { representation: "showing", violation: "breaking", subject: "can lead to", considered: "seen as", sanctions: "punishments" },
      formal: { representation: "formal portrayal", violation: "contravention", subject: "amenable", considered: "deemed", sanctions: "regulatory penalties" },
      creative: { representation: "mirror image", violation: "shattering", subject: "can result in", considered: "viewed as", sanctions: "consequences" },
    };
    const syns = synonymSets[rewriteTone] || synonymSets.academic;
    Object.entries(syns).forEach(([word, replacement]) => {
      rewritten = rewritten.replace(new RegExp(`\\b${word}\\b`, "gi"), replacement);
    });
    // Simulate rewrite level effect
    if (rewriteLevel > 70) {
      rewritten = rewritten.replace(/\. /g, ".\n\n");
    }
    setRewriteResult(rewritten);
  };

  // Citation
  const genCitation = (style: "APA" | "MLA" | "Chicago", src: string) => {
    const y = new Date().getFullYear();
    if (style === "APA") return `Author, A. A. (${y}). ${src}. Publisher. https://doi.org/xxxx`;
    if (style === "MLA") return `Author Last, First. "${src}." Container, vol. X, no. X, ${y}, pp. X–X.`;
    return `Author Last, First. ${src}. Place: Publisher, ${y}.`;
  };

  // Heatmap color
  const heatColor = (sim: number) => {
    if (sim > 50) return "bg-red-500";
    if (sim > 25) return "bg-orange-400";
    if (sim > 5) return "bg-amber-300";
    return "bg-emerald-200";
  };

  // Verdict helpers
  const verdictLabel = (v?: string) => v === "likely_ai" ? "Likely AI" : v === "mixed" ? "Mixed" : "Human";
  const verdictColor = (v?: string) => v === "likely_ai" ? "text-red-500" : v === "mixed" ? "text-amber-500" : "text-emerald-500";

  return (
    <div className="flex h-[calc(100vh-120px)] gap-0 rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-white">

      {/* ══ LEFT COLUMN: Outline + Heatmap ══ */}
      <div className="w-64 shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-800 text-sm">Document Outline</h3>
          <p className="text-[11px] text-slate-400 mt-1">{sections.length} sections detected</p>
        </div>

        {/* Heatmap + Outline */}
        <div className="flex-1 overflow-y-auto" ref={heatmapRef}>
          <div className="flex">
            {/* Heatmap bar */}
            <div className="w-3 shrink-0 flex flex-col">
              {sections.map((s) => (
                <div
                  key={s.id + "-heat"}
                  className={`w-full cursor-pointer ${heatColor(s.similarity)} hover:opacity-80 transition`}
                  style={{ height: `${Math.max(12, (s.text.length / text.length) * 400)}px` }}
                  onClick={() => scrollToSection(s.id)}
                  title={`${s.similarity}% match`}
                />
              ))}
            </div>

            {/* Section list */}
            <div className="flex-1 px-3 py-2 space-y-1">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all ${
                    activeSection === s.id
                      ? "bg-emerald-100 text-emerald-800 font-semibold"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate flex-1">{s.title}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        s.similarity > 25 ? "bg-red-100 text-red-600" : s.similarity > 5 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                      }`}
                    >
                      {s.similarity}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Jump button */}
        <div className="p-3 border-t border-slate-200">
          <button
            onClick={jumpToNextMatch}
            className="w-full py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 transition"
          >
            ↓ Jump to Next Match
          </button>
        </div>
      </div>

      {/* ══ CENTER COLUMN: Document ══ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Score bar */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Similarity</span>
            <span className={`text-lg font-black ${similarityScore > 30 ? "text-red-500" : similarityScore > 10 ? "text-amber-500" : "text-emerald-500"}`}>
              {similarityScore.toFixed(1)}%
            </span>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Originality</span>
            <span className="text-lg font-black text-emerald-500">{originalityScore.toFixed(1)}%</span>
          </div>
          {aiDetection && (
            <>
              <div className="w-px h-6 bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase">AI</span>
                <span className={`text-lg font-black ${verdictColor(aiDetection.verdict)}`}>
                  {aiDetection.aiProbability}%
                </span>
              </div>
            </>
           )}
          {matchTypeSummary && (
            <>
              <div className="w-px h-6 bg-slate-200" />
              <div className="flex gap-1.5">
                {Object.entries(matchTypeSummary).filter(([,v]) => v > 0).map(([type, count]) => (
                  <span key={type} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${matchTypeColors[type]?.bg || 'bg-slate-100'} ${matchTypeColors[type]?.text || 'text-slate-600'}`}>
                    {matchTypeColors[type]?.label || type}: {count}
                  </span>
                ))}
              </div>
            </>
          )}
          <div className="ml-auto text-[10px] text-slate-400">
            {text.trim().split(/\s+/).length} words
          </div>
        </div>

        {/* Pipeline + Explainability */}
        <div className="px-6 py-2 bg-slate-50 border-b border-slate-100">
          {pipelineStages && pipelineStages.length > 0 && (
            <div className="flex items-center gap-2 mb-1">
              {pipelineStages.map((stage, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-[9px] font-bold text-emerald-600">{stage.name}</span>
                  <span className="text-[9px] text-slate-400">{stage.timeMs}ms</span>
                  {i < pipelineStages.length - 1 && <span className="text-slate-300">→</span>}
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-slate-500">
            <strong>Explainable scoring:</strong> <span className="text-red-600">■</span> Exact match <span className="text-orange-500">■</span> Near <span className="text-amber-500">■</span> Paraphrase <span className="text-slate-400">■</span> Common phrase (down-weighted). <em>These are indicators, not verdicts.</em>
          </p>
        </div>

        {/* Document */}
        <div ref={centerRef} className="flex-1 overflow-y-auto px-8 py-6">
          {sections.map((section) => {
            // Render highlighted text for this section
            const frags: JSX.Element[] = [];
            let li = 0;
            const sortedRanges = [...section.matchRanges].sort((a, b) => a.start - b.start);

            for (const rng of sortedRanges) {
              if (rng.start > li) frags.push(<span key={`t${li}`}>{section.text.slice(li, rng.start)}</span>);
              const mt = (rng as any).matchType || "exact";
              const colors = matchTypeColors[mt] || matchTypeColors.exact;
              frags.push(
                <mark key={`m${rng.start}`} className={`${colors.bg} ${colors.text} rounded-sm px-0.5 border-b-2 ${colors.border} cursor-help`}
                  title={`${colors.label} match${(rng as any).confidence ? ` (${(rng as any).confidence}% confidence)` : ''}`}>
                  {section.text.slice(rng.start, rng.end)}
                </mark>
              );
              li = rng.end;
            }
            if (li < section.text.length) frags.push(<span key={`t${li}`}>{section.text.slice(li)}</span>);

            return (
              <div
                key={section.id}
                id={section.id}
                className={`mb-6 p-4 rounded-xl border transition-all ${
                  activeSection === section.id
                    ? "border-emerald-300 bg-emerald-50/30 shadow-sm"
                    : "border-transparent hover:border-slate-200"
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                <div className="text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap">{frags}</div>
                {section.similarity > 0 && (
                  <div className="mt-2 text-[10px] text-red-500 font-medium">
                    ⚠ {section.similarity}% match detected in this section
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ RIGHT COLUMN: Tools ══ */}
      <div className="w-[340px] shrink-0 border-l border-slate-200 flex flex-col overflow-hidden bg-white">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          {([
            { tab: "sources", icon: "📚", label: "Sources" },
            { tab: "rewrite", icon: "✏️", label: "Rewrite" },
            { tab: "cite", icon: "📎", label: "Cite" },
            { tab: "ai", icon: "🤖", label: "AI" },
          ] as const).map(({ tab, icon, label }) => (
            <button
              key={tab}
              onClick={() => setRightTab(tab)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-all ${
                rightTab === tab
                  ? "text-emerald-700 border-b-2 border-emerald-500 bg-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">

          {/* ── Sources Tab ── */}
          {rightTab === "sources" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 mb-2">
                {sources.length} source{sources.length !== 1 ? "s" : ""} found
                {commonPhrasesFound && commonPhrasesFound.length > 0 && (
                  <span className="text-slate-300"> · {commonPhrasesFound.length} common phrases down-weighted</span>
                )}
              </p>

              {/* Top Influential Sources */}
              {sources.length > 2 && (
                <div className="rounded-xl bg-violet-50 border border-violet-200 p-3">
                  <p className="text-[10px] font-bold text-violet-600 uppercase mb-2">🏆 Most Influential Sources</p>
                  {[...sources].sort((a, b) => b.matchPercentage - a.matchPercentage).slice(0, 3).map((src, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1">
                      <span className="text-slate-700 truncate flex-1">{i + 1}. {src.name}</span>
                      <span className="text-violet-700 font-bold">{src.matchPercentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}

              {sources.length === 0 ? (
                <div className="py-8 text-center">
                  <span className="text-3xl block mb-2">✅</span>
                  <p className="text-sm font-bold text-emerald-700">No matches found</p>
                  <p className="text-xs text-slate-400 mt-1">Your text appears 100% original.</p>
                </div>
              ) : (
                sources.map((src, i) => {
                  const m = matches[i];
                  return (
                    <div key={i} className="rounded-xl border border-slate-200 p-3 hover:shadow-sm transition bg-white">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-sm font-medium text-slate-800 break-all leading-tight">{src.name}</span>
                        <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                          {src.matchPercentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeBadgeColors[src.type]}`}>
                          {src.type}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${src.access === "Public" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                          {src.access === "Public" ? "🔓 Public" : "🔒 Paywalled"}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          🌐 {src.region.toUpperCase()}
                        </span>
                      </div>
                      {/* Match type breakdown */}
                      {m?.matchTypes && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {Object.entries(m.matchTypes).filter(([,v]) => v > 0).map(([type, count]) => (
                            <span key={type} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${matchTypeColors[type]?.bg || 'bg-slate-100'} ${matchTypeColors[type]?.text || 'text-slate-600'}`}>
                              {matchTypeColors[type]?.label || type}: {count}
                            </span>
                          ))}
                        </div>
                      )}
                      {m?.rawScore !== undefined && m.rawScore !== m.adjustedScore && (
                        <p className="text-[9px] text-slate-400 mb-1">Raw: {m.rawScore.toFixed(1)}% → Adjusted: {m.adjustedScore?.toFixed(1)}% <span className="text-emerald-500">(common phrases down-weighted)</span></p>
                      )}
                      <div className="flex gap-2 text-[10px]">
                        <button className="text-blue-600 hover:text-blue-800 font-semibold">Compare</button>
                        <span className="text-slate-300">|</span>
                        <button className="text-emerald-600 hover:text-emerald-800 font-semibold" onClick={() => { setRightTab("cite"); }}>Cite</button>
                        <span className="text-slate-300">|</span>
                        <button className="text-violet-600 hover:text-violet-800 font-semibold">Details</button>
                      </div>
                    </div>
                  );
                })
              )}
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 mt-4">
                <p className="text-[11px] text-blue-700">
                  <strong>Explainable scoring:</strong> Common phrases are automatically down-weighted to reduce false positives. Exact/near matches are weighted higher than paraphrases.
                </p>
              </div>
            </div>
          )}

          {/* ── Rewrite Tab ── */}
          {rightTab === "rewrite" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">Select a section on the left, then rewrite flagged passages.</p>

              {/* Tone */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Tone</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["academic", "simple", "formal", "creative"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setRewriteTone(t)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition capitalize ${
                        rewriteTone === t ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rewrite Level */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                  Rewrite Level: {rewriteLevel < 33 ? "Light" : rewriteLevel < 66 ? "Medium" : "Strong"}
                </label>
                <input
                  type="range" min="0" max="100" value={rewriteLevel}
                  onChange={(e) => setRewriteLevel(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                  <span>Light</span><span>Medium</span><span>Strong</span>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                {["Preserve meaning", "Keep keywords", "Keep citations"].map((label) => (
                  <label key={label} className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" defaultChecked className="accent-emerald-500 rounded" />
                    {label}
                  </label>
                ))}
              </div>

              <button onClick={handleRewrite} disabled={!activeSection}
                className="w-full py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:from-blue-400 hover:to-violet-400 transition shadow disabled:opacity-40">
                ✏️ Rewrite Selected Section
              </button>

              {rewriteResult && (
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Result</span>
                    <button onClick={() => navigator.clipboard.writeText(rewriteResult)} className="text-[10px] text-blue-600 font-semibold">Copy</button>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{rewriteResult}</p>
                </div>
              )}
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                <p className="text-[11px] text-amber-700">
                  <strong>Ethics note:</strong> Use rewriting to improve your own ideas — not to disguise copied content. Always cite original sources.
                </p>
              </div>
            </div>
          )}

          {/* ── Citation Tab ── */}
          {rightTab === "cite" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">Generate citations for matched sources.</p>
              <div className="flex gap-1.5">
                {(["APA", "MLA", "Chicago"] as const).map((s) => (
                  <button key={s} onClick={() => setCitationStyle(s)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                      citationStyle === s ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
              {sources.map((src, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">{src.name}</span>
                  <p className="text-xs text-slate-700 font-mono leading-relaxed break-all">{genCitation(citationStyle, src.name)}</p>
                  <button onClick={() => navigator.clipboard.writeText(genCitation(citationStyle, src.name))}
                    className="mt-2 text-[10px] text-blue-600 font-semibold">📋 Copy</button>
                </div>
              ))}
              {sources.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-sm">No sources to cite.</div>
              )}
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                <p className="text-[11px] text-blue-700">
                  💡 Replace placeholder fields with your actual source details (Author, Title, URL).
                </p>
              </div>
            </div>
          )}

          {/* ── AI Tab ── */}
          {rightTab === "ai" && (
            <div className="space-y-4">
              {aiDetection ? (
                <>
                  <div className={`rounded-xl p-4 border text-center ${
                    aiDetection.verdict === "likely_ai" ? "bg-red-50 border-red-200" : aiDetection.verdict === "mixed" ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"
                  }`}>
                    <p className={`text-xl font-black ${verdictColor(aiDetection.verdict)}`}>{verdictLabel(aiDetection.verdict)}</p>
                    <p className="text-xs text-slate-500 mt-1">{aiDetection.aiProbability}% AI · {aiDetection.humanProbability}% Human</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl p-3 bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Burstiness</span>
                      <span className="text-lg font-black text-slate-800">{aiDetection.burstiness}</span>
                      <span className="text-[10px] text-slate-400">/100</span>
                      <div className="w-full bg-slate-200 rounded-full h-1 mt-1.5"><div className="bg-cyan-500 h-1 rounded-full" style={{ width: `${aiDetection.burstiness}%` }} /></div>
                    </div>
                    <div className="rounded-xl p-3 bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Perplexity</span>
                      <span className="text-lg font-black text-slate-800">{aiDetection.perplexity}</span>
                      <span className="text-[10px] text-slate-400">/100</span>
                      <div className="w-full bg-slate-200 rounded-full h-1 mt-1.5"><div className="bg-violet-500 h-1 rounded-full" style={{ width: `${aiDetection.perplexity}%` }} /></div>
                    </div>
                  </div>
                  <div className="rounded-xl p-3 bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Sentences</span><span className="font-semibold">{aiDetection.sentenceCount}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Avg length</span><span className="font-semibold">{aiDetection.avgSentenceLength} words</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Vocabulary</span><span className="font-semibold">{(aiDetection.vocabularyRichness * 100).toFixed(1)}%</span></div>
                  </div>
                  <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                    <p className="text-[11px] text-blue-700">
                      <strong>What this doesn&apos;t mean:</strong> AI detection is probabilistic. High scores don&apos;t definitively prove AI use. Formulaic writing, translations, and technical documents may score higher.
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <span className="text-3xl block mb-2">🤖</span>
                  <p className="text-sm">AI detection data will appear here after scanning.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
