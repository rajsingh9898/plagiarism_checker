"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { buildAuthorProfile, type AuthorProfile, type StyleMetrics } from "@/lib/authorship-fingerprint";

export default function FingerprintPage() {
  const [text, setText] = useState("");
  const [profile, setProfile] = useState<AuthorProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = () => {
    if (text.trim().split(/\s+/).length < 50) { toast.error("Need at least 50 words"); return; }
    setLoading(true);
    setTimeout(() => {
      const p = buildAuthorProfile(text);
      setProfile(p);
      setLoading(false);
      toast.success("Style fingerprint computed!");
    }, 600);
  };

  const MetricBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-36 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-12 text-right">{value}</span>
    </div>
  );

  const shiftColor = (c: number) => c > 60 ? "border-red-200 bg-red-50" : c > 30 ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50";
  const shiftText = (c: number) => c > 60 ? "text-red-700" : c > 30 ? "text-amber-700" : "text-blue-700";

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900">Authorship Fingerprint</h1>
        <p className="text-slate-500 text-sm mt-1">Analyze writing style consistency — detect style shifts between sections.</p>
      </div>

      {!profile ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <textarea
              className="w-full min-h-[300px] resize-none outline-none text-[15px] text-slate-800 placeholder-slate-400 leading-relaxed"
              placeholder="Paste text to analyze writing style…&#10;&#10;The engine measures sentence structure, vocabulary, punctuation habits, readability, and more. Multiple paragraphs enable style shift detection."
              value={text} onChange={(e) => setText(e.target.value)} disabled={loading}
            />
          </div>
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 flex items-center gap-3">
            <button onClick={analyze} disabled={loading || text.trim().split(/\s+/).length < 50}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold rounded-full text-sm hover:from-violet-400 hover:to-purple-500 transition shadow disabled:opacity-40 flex items-center gap-2">
              {loading ? (<><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing…</>) : "🔬 Analyze Style"}
            </button>
            <span className="ml-auto text-xs text-slate-400">{text.trim().split(/\s+/).filter(Boolean).length} words</span>
          </div>
        </div>
      ) : (
        <>
          <button onClick={() => setProfile(null)} className="mb-6 text-sm text-violet-600 font-semibold hover:text-violet-800">← Analyze new text</button>

          {/* Consistency Score */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
              <span className="text-xs font-bold text-slate-400 uppercase">Style Consistency</span>
              <p className={`text-4xl font-black mt-2 ${profile.consistency > 70 ? "text-emerald-500" : profile.consistency > 40 ? "text-amber-500" : "text-red-500"}`}>
                {profile.consistency}%
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Higher = more uniform writing</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
              <span className="text-xs font-bold text-slate-400 uppercase">Readability</span>
              <p className="text-4xl font-black text-blue-500 mt-2">{profile.overallMetrics.readabilityScore}</p>
              <p className="text-[10px] text-slate-400 mt-1">Flesch score (0=hard, 100=easy)</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
              <span className="text-xs font-bold text-slate-400 uppercase">Style Shifts</span>
              <p className={`text-4xl font-black mt-2 ${profile.shifts.length > 2 ? "text-red-500" : profile.shifts.length > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                {profile.shifts.length}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Section-to-section changes</p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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

          {/* Style Shifts */}
          {profile.shifts.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-8">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><span>⚡</span> Style Shift Alerts</h3>
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
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 mt-4">
                <p className="text-[11px] text-blue-700">
                  <strong>Note:</strong> Style shifts are assistive evidence, not a verdict. Differences may reflect topic changes, added quotations, or natural writing variance.
                </p>
              </div>
            </div>
          )}

          {/* Section-by-section breakdown */}
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
        </>
      )}
    </div>
  );
}
