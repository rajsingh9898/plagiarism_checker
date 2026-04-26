"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { type AuthorProfile } from "@/lib/authorship-fingerprint";

// ── Types ──
type GeminiAuthorshipResult = {
  consistencyScore: number;
  dominantStyle: string;
  voiceCharacteristics: string[];
  styleShifts: {
    location: string;
    description: string;
    severity: "high" | "medium" | "low";
    possibleExplanation: string;
  }[];
  writingPersonality: string;
  authenticityVerdict: "consistent" | "mixed" | "suspicious";
  authenticityReasoning: string;
  recommendations: string[];
};

type AnalysisResult = {
  statistical: AuthorProfile | null;
  gemini: GeminiAuthorshipResult | null;
};

// ── Helpers ──
function MetricBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-36 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-12 text-right">{value}</span>
    </div>
  );
}

function verdictConfig(v: GeminiAuthorshipResult["authenticityVerdict"]) {
  if (v === "consistent") return { color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: "✅", label: "Consistent Author" };
  if (v === "mixed") return { color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: "⚠️", label: "Mixed Signals" };
  return { color: "text-red-600", bg: "bg-red-50 border-red-200", icon: "🚨", label: "Suspicious" };
}

function shiftSeverityConfig(s: "high" | "medium" | "low") {
  if (s === "high") return { border: "border-red-200 bg-red-50", badge: "bg-red-100 text-red-700" };
  if (s === "medium") return { border: "border-amber-200 bg-amber-50", badge: "bg-amber-100 text-amber-700" };
  return { border: "border-blue-200 bg-blue-50", badge: "bg-blue-100 text-blue-700" };
}

export default function FingerprintPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"gemini" | "statistical">("gemini");

  const analyze = async () => {
    const wc = text.trim().split(/\s+/).length;
    if (wc < 50) { toast.error("Need at least 50 words"); return; }

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/fingerprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Analysis failed");
      }
      const data = await res.json();
      setResult(data);
      toast.success("🔬 Authorship analysis complete!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const profile = result?.statistical;
  const gemini = result?.gemini;

  const shiftColor = (c: number) => c > 60 ? "border-red-200 bg-red-50" : c > 30 ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50";
  const shiftText = (c: number) => c > 60 ? "text-red-700" : c > 30 ? "text-amber-700" : "text-blue-700";

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
          🔬 Authorship Fingerprint
          <span className="text-[11px] font-bold bg-gradient-to-r from-violet-500 to-purple-600 text-white px-2.5 py-1 rounded-full ml-1">
            Gemini Powered
          </span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Deep writing style analysis — detect style shifts, voice consistency, and authorship authenticity.
        </p>
      </div>

      {/* Input */}
      {!result && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <textarea
              className="w-full min-h-[300px] resize-none outline-none text-[15px] text-slate-800 placeholder-slate-400 leading-relaxed bg-transparent"
              placeholder={"Paste text to analyze authorship style…\n\nThe engine uses Google Gemini to detect voice consistency, dominant style, and suspicious style shifts. Multiple paragraphs give better results."}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 flex items-center gap-3">
            <button
              onClick={analyze}
              disabled={loading || text.trim().split(/\s+/).length < 50}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold rounded-full text-sm hover:from-violet-400 hover:to-purple-500 transition shadow disabled:opacity-40 flex items-center gap-2"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing…</>
              ) : "🔬 Analyze Style"}
            </button>
            <span className="ml-auto text-xs text-slate-400">
              {text.trim().split(/\s+/).filter(Boolean).length} words
            </span>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center py-16 gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 animate-pulse">Gemini is analyzing writing style and authenticity…</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          <button
            onClick={() => setResult(null)}
            className="mb-6 text-sm text-violet-600 font-semibold hover:text-violet-800"
          >
            ← Analyze new text
          </button>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
              <span className="text-xs font-bold text-slate-400 uppercase">Style Consistency</span>
              <p className={`text-4xl font-black mt-2 ${
                (gemini?.consistencyScore ?? profile?.consistency ?? 0) > 70 ? "text-emerald-500"
                  : (gemini?.consistencyScore ?? profile?.consistency ?? 0) > 40 ? "text-amber-500"
                  : "text-red-500"
              }`}>
                {gemini?.consistencyScore ?? profile?.consistency ?? "—"}%
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                {gemini ? "Gemini analysis" : "Statistical analysis"}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
              <span className="text-xs font-bold text-slate-400 uppercase">Dominant Style</span>
              <p className="text-2xl font-black text-violet-600 mt-2">
                {gemini?.dominantStyle ?? "Unknown"}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Writing register</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
              <span className="text-xs font-bold text-slate-400 uppercase">Readability (Flesch)</span>
              <p className="text-4xl font-black text-blue-500 mt-2">
                {profile?.overallMetrics.readabilityScore ?? "—"}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">0=hard, 100=easy</p>
            </div>
          </div>

          {/* Gemini Verdict */}
          {gemini && (
            <div className={`rounded-2xl border p-5 mb-6 ${verdictConfig(gemini.authenticityVerdict).bg}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{verdictConfig(gemini.authenticityVerdict).icon}</span>
                <div>
                  <p className={`font-bold text-lg ${verdictConfig(gemini.authenticityVerdict).color}`}>
                    {verdictConfig(gemini.authenticityVerdict).label}
                  </p>
                  <p className="text-xs text-slate-500">Gemini authorship verdict</p>
                </div>
              </div>
              <p className="text-sm text-slate-700">{gemini.authenticityReasoning}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab("gemini")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${activeTab === "gemini" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
            >
              ✨ Gemini Deep Analysis
            </button>
            <button
              onClick={() => setActiveTab("statistical")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${activeTab === "statistical" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
            >
              📊 Statistical Metrics
            </button>
          </div>

          {/* GEMINI TAB */}
          {activeTab === "gemini" && gemini && (
            <div className="space-y-6">
              {/* Writing Personality */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><span>🖊️</span> Writing Personality</h3>
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-xl p-4">
                  <p className="text-sm text-slate-700 leading-relaxed">{gemini.writingPersonality}</p>
                </div>
              </div>

              {/* Voice Characteristics */}
              {gemini.voiceCharacteristics.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><span>🎤</span> Voice Characteristics</h3>
                  <div className="flex flex-wrap gap-2">
                    {gemini.voiceCharacteristics.map((v, i) => (
                      <span key={i} className="px-3 py-1.5 bg-violet-100 text-violet-700 text-sm font-medium rounded-full">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Style Shifts (Gemini) */}
              {gemini.styleShifts.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><span>⚡</span> Style Shift Alerts</h3>
                  <div className="space-y-3">
                    {gemini.styleShifts.map((shift, i) => {
                      const cfg = shiftSeverityConfig(shift.severity);
                      return (
                        <div key={i} className={`rounded-xl border p-4 ${cfg.border}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-slate-800">{shift.location}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${cfg.badge}`}>
                              {shift.severity} severity
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 mb-1">{shift.description}</p>
                          <p className="text-xs text-slate-500 italic">{shift.possibleExplanation}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {gemini.recommendations.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><span>💡</span> Recommendations</h3>
                  <ul className="space-y-2">
                    {gemini.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-violet-500 font-bold shrink-0">{i + 1}.</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* STATISTICAL TAB */}
          {activeTab === "statistical" && profile && (
            <div className="space-y-6">
              {/* Statistical Style Shifts */}
              {profile.shifts.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><span>⚡</span> Statistical Style Shifts</h3>
                  <div className="space-y-3">
                    {profile.shifts.map((shift, i) => (
                      <div key={i} className={`rounded-xl border p-4 ${shiftColor(shift.confidence)}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-slate-800">{shift.sectionA} → {shift.sectionB}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${shiftText(shift.confidence)} bg-white/60`}>
                            {shift.confidence}% confidence
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{shift.explanation}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {shift.metrics.map((m) => (
                            <span key={m} className="text-[10px] bg-white/70 border border-slate-200 px-2 py-0.5 rounded-full text-slate-500">{m}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><span>📝</span> Sentence Structure</h3>
                  <div className="space-y-3">
                    <MetricBar label="Avg sentence length" value={profile.overallMetrics.avgSentenceLength} max={40} color="bg-blue-500" />
                    <MetricBar label="Length variation" value={profile.overallMetrics.sentenceLengthStdDev} max={20} color="bg-indigo-500" />
                    <MetricBar label="Short sentences %" value={profile.overallMetrics.shortSentenceRatio} max={100} color="bg-cyan-500" />
                    <MetricBar label="Long sentences %" value={profile.overallMetrics.longSentenceRatio} max={100} color="bg-violet-500" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><span>📖</span> Vocabulary</h3>
                  <div className="space-y-3">
                    <MetricBar label="Vocab richness (TTR)" value={Math.round(profile.overallMetrics.vocabularyRichness * 100)} max={100} color="bg-emerald-500" />
                    <MetricBar label="Avg word length" value={profile.overallMetrics.avgWordLength} max={10} color="bg-teal-500" />
                    <MetricBar label="Complex words %" value={profile.overallMetrics.complexWordRatio} max={100} color="bg-green-500" />
                    <MetricBar label="Unique words" value={profile.overallMetrics.uniqueWords} max={500} color="bg-lime-500" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><span>✏️</span> Punctuation Habits</h3>
                  <div className="space-y-3">
                    <MetricBar label="Commas/sentence" value={profile.overallMetrics.commasPerSentence} max={5} color="bg-amber-500" />
                    <MetricBar label="Semicolons/sentence" value={profile.overallMetrics.semicolonsPerSentence} max={2} color="bg-orange-500" />
                    <MetricBar label="Questions %" value={profile.overallMetrics.questionRatio} max={50} color="bg-rose-500" />
                    <MetricBar label="Exclamations %" value={profile.overallMetrics.exclamationRatio} max={20} color="bg-red-500" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><span>🔧</span> Writing Patterns</h3>
                  <div className="space-y-3">
                    <MetricBar label="Transitions used" value={profile.overallMetrics.transitionalPhraseCount} max={20} color="bg-purple-500" />
                    <MetricBar label="Passive voice" value={profile.overallMetrics.passiveVoiceEstimate} max={15} color="bg-pink-500" />
                    <MetricBar label="Contractions" value={profile.overallMetrics.contractionCount} max={20} color="bg-fuchsia-500" />
                    <MetricBar label="Readability" value={profile.overallMetrics.readabilityScore} max={100} color="bg-sky-500" />
                  </div>
                </div>
              </div>

              {/* Section Table */}
              {profile.sectionMetrics.length > 1 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><span>📊</span> Per-Section Comparison</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-400 uppercase border-b border-slate-100">
                          <th className="text-left py-2 px-3 font-semibold">Section</th>
                          <th className="text-center py-2 px-2 font-semibold">Avg Sent.</th>
                          <th className="text-center py-2 px-2 font-semibold">Vocab</th>
                          <th className="text-center py-2 px-2 font-semibold">Complex%</th>
                          <th className="text-center py-2 px-2 font-semibold">Commas</th>
                          <th className="text-center py-2 px-2 font-semibold">Read.</th>
                          <th className="text-center py-2 px-2 font-semibold">Passive</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.sectionMetrics.map((sm, i) => (
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-medium text-slate-700">{sm.section}</td>
                            <td className="text-center py-2 px-2 text-slate-600">{sm.metrics.avgSentenceLength}</td>
                            <td className="text-center py-2 px-2 text-slate-600">{Math.round(sm.metrics.vocabularyRichness * 100)}%</td>
                            <td className="text-center py-2 px-2 text-slate-600">{sm.metrics.complexWordRatio}%</td>
                            <td className="text-center py-2 px-2 text-slate-600">{sm.metrics.commasPerSentence}</td>
                            <td className="text-center py-2 px-2 text-slate-600">{sm.metrics.readabilityScore}</td>
                            <td className="text-center py-2 px-2 text-slate-600">{sm.metrics.passiveVoiceEstimate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
