"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

// ── Types ──
type Suggestion = {
  type: "grammar" | "clarity" | "style" | "structure" | "vocabulary" | "citation";
  severity: "error" | "warning" | "suggestion";
  original: string;
  improved: string;
  explanation: string;
};

type CoachResult = {
  overallScore: number;
  grammarScore: number;
  clarityScore: number;
  styleScore: number;
  structureScore: number;
  suggestions: Suggestion[];
  strengths: string[];
  areasToImprove: string[];
  rewrittenIntro: string;
  summary: string;
};

type ScanData = {
  id: string;
  text: string;
  similarityScore: number;
  originalityScore: number;
  createdAt: string;
};

// ── Helpers ──
function severityColor(s: Suggestion["severity"]) {
  return s === "error"
    ? "border-red-200 bg-red-50"
    : s === "warning"
    ? "border-amber-200 bg-amber-50"
    : "border-blue-200 bg-blue-50";
}

function severityBadge(s: Suggestion["severity"]) {
  return s === "error"
    ? "bg-red-100 text-red-700"
    : s === "warning"
    ? "bg-amber-100 text-amber-700"
    : "bg-blue-100 text-blue-700";
}

function typeIcon(t: Suggestion["type"]) {
  const map: Record<Suggestion["type"], string> = {
    grammar: "✏️", clarity: "💡", style: "🎨",
    structure: "🏗️", vocabulary: "📖", citation: "📎",
  };
  return map[t] ?? "📝";
}

function typeColor(t: Suggestion["type"]) {
  const map: Record<Suggestion["type"], string> = {
    grammar: "bg-rose-100 text-rose-700",
    clarity: "bg-yellow-100 text-yellow-700",
    style: "bg-purple-100 text-purple-700",
    structure: "bg-blue-100 text-blue-700",
    vocabulary: "bg-emerald-100 text-emerald-700",
    citation: "bg-indigo-100 text-indigo-700",
  };
  return map[t] ?? "bg-slate-100 text-slate-700";
}

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="68" height="68" className="-rotate-90">
        <circle cx="34" cy="34" r={radius} strokeWidth="6" stroke="#e2e8f0" fill="none" />
        <circle
          cx="34" cy="34" r={radius} strokeWidth="6" fill="none"
          stroke={color}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <span className="text-xs font-bold text-slate-700 -mt-10 rotate-90 relative top-0">{score}</span>
      <span className="text-[10px] text-slate-500 text-center leading-tight">{label}</span>
    </div>
  );
}

export default function CoachPage() {
  const [mode, setMode] = useState<"scan" | "custom">("scan");
  const [scans, setScans] = useState<ScanData[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanData | null>(null);
  const [customText, setCustomText] = useState("");
  const [coachResult, setCoachResult] = useState<CoachResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [scansLoading, setScansLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"suggestions" | "rewrite" | "summary">("suggestions");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    setScansLoading(true);
    try {
      const res = await fetch("/api/scans");
      if (res.ok) {
        const data = await res.json();
        setScans(data);
      }
    } catch {}
    setScansLoading(false);
  };

  const runCoach = async (textToAnalyze: string) => {
    if (!textToAnalyze.trim()) { toast.error("No text to analyze."); return; }
    const wc = textToAnalyze.trim().split(/\s+/).length;
    if (wc < 20) { toast.error("Need at least 20 words."); return; }

    setLoading(true);
    setCoachResult(null);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToAnalyze }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Coach analysis failed.");
      }
      const data = await res.json();
      setCoachResult(data);
      toast.success("✨ Gemini writing coach complete!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSuggestions = coachResult?.suggestions.filter(
    (s) => filterType === "all" || s.type === filterType
  ) ?? [];

  const tabs = [
    { key: "suggestions", label: "Suggestions", count: coachResult?.suggestions.length },
    { key: "rewrite", label: "Example Rewrite", count: null },
    { key: "summary", label: "Feedback", count: null },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            ✨ AI Writing Coach
            <span className="text-[11px] font-bold bg-gradient-to-r from-violet-500 to-purple-600 text-white px-2.5 py-1 rounded-full ml-1">
              Gemini Powered
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Get grammar, clarity, style, and structure feedback powered by Google Gemini.
          </p>
        </div>
        <Link
          href="/app/check"
          className="px-5 py-2 text-sm font-bold rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 transition shadow"
        >
          + New Scan
        </Link>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setMode("scan"); setCoachResult(null); }}
          className={`px-5 py-2 text-sm font-semibold rounded-full transition ${mode === "scan" ? "bg-violet-600 text-white shadow" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
        >
          📋 From Scan History
        </button>
        <button
          onClick={() => { setMode("custom"); setCoachResult(null); }}
          className={`px-5 py-2 text-sm font-semibold rounded-full transition ${mode === "custom" ? "bg-violet-600 text-white shadow" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
        >
          ✏️ Paste Custom Text
        </button>
      </div>

      {/* INPUT AREA */}
      {!coachResult && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          {mode === "scan" ? (
            scansLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
              </div>
            ) : scans.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-4xl block mb-3">📝</span>
                <p className="font-bold text-slate-700">No scans yet</p>
                <p className="text-slate-500 text-sm mt-1">Run a plagiarism scan first to use the coach.</p>
                <Link href="/app/check" className="inline-block mt-4 px-5 py-2 bg-emerald-500 text-white text-sm font-bold rounded-full hover:bg-emerald-400 transition">
                  Start a Scan
                </Link>
              </div>
            ) : (
              <div className="p-6">
                <p className="text-sm font-semibold text-slate-600 mb-3">Select a scan to analyze:</p>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {scans.map((scan) => (
                    <button
                      key={scan.id}
                      onClick={() => setSelectedScan(scan)}
                      className={`w-full text-left p-3 rounded-xl border transition text-sm ${
                        selectedScan?.id === scan.id
                          ? "border-violet-400 bg-violet-50 text-violet-800"
                          : "border-slate-200 hover:border-violet-200 hover:bg-violet-50/50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{scan.text.slice(0, 60)}…</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 shrink-0 ${
                          scan.originalityScore >= 80 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {scan.originalityScore.toFixed(0)}% orig
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {scan.text.trim().split(/\s+/).length} words
                        · {new Date(scan.createdAt).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
                {selectedScan && (
                  <button
                    onClick={() => runCoach(selectedScan.text)}
                    disabled={loading}
                    className="mt-4 w-full py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold rounded-xl text-sm hover:from-violet-400 hover:to-purple-500 transition disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing with Gemini…</>
                    ) : "✨ Analyze with Gemini"}
                  </button>
                )}
              </div>
            )
          ) : (
            <div>
              <div className="p-6">
                <textarea
                  className="w-full min-h-[250px] resize-none outline-none text-[15px] text-slate-800 placeholder-slate-400 leading-relaxed bg-transparent"
                  placeholder="Paste your text here for Gemini-powered writing feedback…&#10;&#10;Minimum 20 words required."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 flex items-center gap-3">
                <button
                  onClick={() => runCoach(customText)}
                  disabled={loading || customText.trim().split(/\s+/).length < 20}
                  className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold rounded-full text-sm hover:from-violet-400 hover:to-purple-500 transition shadow disabled:opacity-40 flex items-center gap-2"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing…</>
                  ) : "✨ Get Writing Feedback"}
                </button>
                <span className="ml-auto text-xs text-slate-400">
                  {customText.trim().split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center py-16 gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 animate-pulse">Gemini is analyzing your writing…</p>
        </div>
      )}

      {/* RESULTS */}
      {coachResult && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">Writing Analysis Results</h2>
            <button
              onClick={() => setCoachResult(null)}
              className="px-4 py-1.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition"
            >
              ← Analyze New Text
            </button>
          </div>

          {/* Score Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Overall Writing Score</p>
                <p className={`text-5xl font-black mt-1 ${
                  coachResult.overallScore >= 80 ? "text-emerald-500"
                    : coachResult.overallScore >= 60 ? "text-amber-500"
                    : "text-red-500"
                }`}>{coachResult.overallScore}<span className="text-xl text-slate-400">/100</span></p>
              </div>
              <div className="flex gap-6 flex-wrap justify-end">
                <ScoreRing score={coachResult.grammarScore} label="Grammar" color="#10b981" />
                <ScoreRing score={coachResult.clarityScore} label="Clarity" color="#f59e0b" />
                <ScoreRing score={coachResult.styleScore} label="Style" color="#8b5cf6" />
                <ScoreRing score={coachResult.structureScore} label="Structure" color="#3b82f6" />
              </div>
            </div>

            {/* Strengths & Areas to Improve */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                <p className="text-xs font-bold text-emerald-700 uppercase mb-2">✅ Strengths</p>
                <ul className="space-y-1">
                  {coachResult.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-emerald-800 flex items-start gap-1.5">
                      <span className="shrink-0 mt-0.5">•</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                <p className="text-xs font-bold text-amber-700 uppercase mb-2">📈 Areas to Improve</p>
                <ul className="space-y-1">
                  {coachResult.areasToImprove.map((a, i) => (
                    <li key={i} className="text-sm text-amber-800 flex items-start gap-1.5">
                      <span className="shrink-0 mt-0.5">•</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-slate-100 rounded-xl p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
                  activeTab === tab.key ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                {tab.count != null && (
                  <span className="ml-1.5 bg-violet-100 text-violet-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "suggestions" && (
            <>
              {/* Filter */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {["all", "grammar", "clarity", "style", "structure", "vocabulary", "citation"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1 text-xs font-bold rounded-full transition capitalize ${
                      filterType === t ? "bg-violet-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {t === "all" ? "All" : `${typeIcon(t as any)} ${t}`}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {filteredSuggestions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">No suggestions in this category.</div>
                ) : (
                  filteredSuggestions.map((s, i) => (
                    <div key={i} className={`rounded-xl border p-4 ${severityColor(s.severity)}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColor(s.type)}`}>
                          {typeIcon(s.type)} {s.type}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${severityBadge(s.severity)}`}>
                          {s.severity}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                        <div className="bg-red-50 border border-red-100 rounded-lg p-2.5">
                          <p className="text-[10px] font-bold text-red-500 mb-1">ORIGINAL</p>
                          <p className="text-sm text-red-800 italic">"{s.original}"</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
                          <p className="text-[10px] font-bold text-emerald-600 mb-1">IMPROVED</p>
                          <p className="text-sm text-emerald-800">"{s.improved}"</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600">{s.explanation}</p>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === "rewrite" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">✨</span>
                <h3 className="font-bold text-slate-800">Gemini's Example Rewrite</h3>
                <span className="text-[10px] bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">First Paragraph</span>
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-xl p-5">
                <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">
                  {coachResult.rewrittenIntro || "No rewrite available for this text."}
                </p>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                This is Gemini's suggestion for how the opening of your document could be improved. Use it as inspiration, not a replacement.
              </p>
            </div>
          )}

          {activeTab === "summary" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">📋 Overall Writing Assessment</h3>
              <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-100 rounded-xl p-5">
                <p className="text-slate-700 leading-relaxed">{coachResult.summary}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Grammar", score: coachResult.grammarScore, color: "text-emerald-600" },
                  { label: "Clarity", score: coachResult.clarityScore, color: "text-amber-600" },
                  { label: "Style", score: coachResult.styleScore, color: "text-violet-600" },
                  { label: "Structure", score: coachResult.structureScore, color: "text-blue-600" },
                ].map((item) => (
                  <div key={item.label} className="text-center bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className={`text-2xl font-black ${item.color}`}>{item.score}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
