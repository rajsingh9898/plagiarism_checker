"use client";

import { useState, useRef } from "react";
import toast from "react-hot-toast";
import ReportWorkspace from "@/components/ReportWorkspace";

/* ── Types ── */
type MatchResult = {
  sourceName: string;
  sourceDocumentId: string;
  matchPercentage: number;
  matchRanges: { start: number; end: number; matchType?: string; confidence?: number; sourceSnippet?: string }[];
  sourceType?: string;
  matchTypes?: Record<string, number>;
  rawScore?: number;
  adjustedScore?: number;
};

type AiDetection = {
  aiProbability: number;
  humanProbability: number;
  burstiness: number;
  perplexity: number;
  verdict: "likely_human" | "mixed" | "likely_ai";
  sentenceCount: number;
  avgSentenceLength: number;
  vocabularyRichness: number;
};

type ScanResult = {
  scanId: string;
  similarityScore: number;
  originalityScore: number;
  matches: MatchResult[];
  matchTypeSummary?: Record<string, number>;
  commonPhrasesFound?: string[];
  pipelineStages?: { name: string; status: string; timeMs: number; detail: string }[];
  aiDetection: AiDetection;
};

export default function CheckPage() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!text && !file) { toast.error("Provide text or upload a file."); return; }
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    if (file) formData.append("file", file);
    if (text) formData.append("text", text);
    try {
      const res = await fetch("/api/check", { method: "POST", body: formData });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Scan failed"); }
      const data = await res.json();
      setResult(data);
      toast.success("Scan complete!");
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setText(""); toast.success(`Attached: ${f.name}`); }
  };

  const trySampleText = () => {
    setFile(null);
    setText(
      "Plagiarism is the representation of another author's language, thoughts, ideas, or expressions as one's own original work. In educational contexts, there are differing definitions of plagiarism depending on the institution.\n\nPlagiarism is considered a violation of academic integrity and a breach of journalistic ethics. It is subject to sanctions such as penalties, suspension, expulsion from school or work, substantial fines and even incarceration.\n\nThe concept of plagiarism as a form of theft originated in the 1st century. It was not until the Enlightenment era that the idea of intellectual property was established and authors could earn money from their creative work.\n\nModern plagiarism detection tools use sophisticated algorithms including n-gram analysis, fingerprinting, and machine learning to identify copied content across billions of documents."
    );
  };

  // ─── WORKSPACE VIEW (after results) ───
  if (result) {
    return (
      <div className="max-w-full mx-auto flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-extrabold text-slate-900">Analysis Workspace</h1>
          <div className="flex gap-2">
            <button onClick={() => { setResult(null); }} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
              ← New Scan
            </button>
            <button onClick={() => window.print()} className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl hover:from-emerald-400 hover:to-cyan-400 transition">
              📄 Export
            </button>
          </div>
        </div>
        <ReportWorkspace
          text={text || ""}
          matches={result.matches as any}
          similarityScore={result.similarityScore}
          originalityScore={result.originalityScore}
          matchTypeSummary={result.matchTypeSummary as any}
          commonPhrasesFound={result.commonPhrasesFound}
          pipelineStages={result.pipelineStages}
          aiDetection={result.aiDetection}
        />
      </div>
    );
  }

  // ─── INPUT VIEW ───
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8 mt-4">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Plagiarism & AI Checker</h1>
        <p className="text-slate-500">Paste text or upload a file. Results open in a full analysis workspace.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col min-h-[450px] overflow-hidden">
        <div className="flex-1 p-6">
          <textarea
            className="w-full h-full min-h-[300px] resize-none outline-none text-[15px] text-slate-800 placeholder-slate-400 leading-relaxed bg-transparent"
            placeholder={file ? `📎 ${file.name} attached — click Scan to analyze.` : "Type, paste, or upload your text here…\n\nMinimum 50 words required."}
            value={text}
            onChange={(e) => { setText(e.target.value); setFile(null); }}
            disabled={!!file || loading}
          />
        </div>

        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 flex flex-wrap items-center gap-3">
          <button onClick={handleSubmit} disabled={loading || (!text && !file)}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-full hover:from-emerald-400 hover:to-cyan-400 transition shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-sm">
            {loading ? (<><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Scanning…</>) : "🔍 Start Deep Scan"}
          </button>
          <input type="file" accept=".txt,.pdf,.docx" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 border border-slate-300 text-slate-600 bg-white font-medium rounded-full hover:bg-slate-50 transition text-sm flex items-center gap-1.5">
            📄 Upload
          </button>
          {!text && !file && <button onClick={trySampleText} className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-semibold">Try sample</button>}
          {file && <button onClick={() => setFile(null)} className="ml-auto text-xs text-red-600 hover:text-red-800 font-semibold">✕ Remove</button>}
          {text && <span className="ml-auto text-xs text-slate-400">{text.trim().split(/\s+/).length} words</span>}
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center py-16 gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 animate-pulse">Running deep analysis — plagiarism, AI detection, & more…</p>
        </div>
      )}
    </div>
  );
}
