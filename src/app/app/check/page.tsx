"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import ReportWorkspace from "@/components/ReportWorkspace";

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
  analysisMethod?: string;
};

type ScanResult = {
  scanId: string;
  similarityScore: number;
  originalityScore: number;
  semanticScore?: number;
  citationScore?: number;
  writingScore?: number;
  matches: MatchResult[];
  matchTypeSummary?: Record<string, number>;
  commonPhrasesFound?: string[];
  pipelineStages?: { name: string; status: string; timeMs: number; detail: string }[];
  aiDetection: AiDetection;
  paraphraseAnalysis?: {
    paraphrasingDetected: boolean;
    paraphrasingScore: number;
    suspiciousSegments: { text: string; reason: string; severity: string }[];
    overallVerdict: string;
    suggestedActions: string[];
  } | null;
  sourceIntelligence?: {
    sourceName: string;
    sourceType: string;
    category: string;
    confidence: number;
    matchPercentage: number;
  }[];
  citationSummary?: {
    score: number;
    styleHint: string;
    issues: { issue: string; severity: string; excerpt: string; recommendation: string }[];
  };
  writingSummary?: {
    score: number;
    suggestions: { original: string; improved: string; reason: string; severity: string }[];
  };
  semanticSummary?: {
    score: number;
    multilingualSegments: number;
    paraphraseSignals: number;
  };
};

type JobState = {
  id: string;
  status: string;
  stage: string;
  progress: number;
  events: { id: string; stage: string; status: string; message: string }[];
  result: ScanResult | null;
  error?: string;
};

function prettyStage(stage: string) {
  const map: Record<string, string> = {
    upload: "Upload",
    preprocessing: "Preprocess",
    dedup: "Dedup",
    matching: "Matching",
    semantic: "Semantic",
    ai: "AI Analysis",
    report: "Report",
    failed: "Failed",
  };
  return map[stage] || stage;
}

export default function CheckPage() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [job, setJob] = useState<JobState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pollJob = async (jobId: string) => {
    for (let i = 0; i < 180; i++) {
      const r = await fetch(`/api/scans/jobs/${jobId}`, { cache: "no-store" });
      const data = await r.json();

      const current: JobState = {
        id: data.id,
        status: data.status,
        stage: data.stage,
        progress: data.progress,
        events: data.events || [],
        result: data.result || null,
        error: data.error || undefined,
      };

      setJob(current);

      if (current.status === "completed" && current.result) {
        setResult(current.result);
        setLoading(false);
        toast.success("Scan complete!");
        return;
      }

      if (current.status === "failed") {
        setLoading(false);
        toast.error(current.error || "Scan failed");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    setLoading(false);
    toast.error("Scan timed out. Please try again.");
  };

  const handleSubmit = async () => {
    if (!text && !file) {
      toast.error("Provide text or upload a file.");
      return;
    }

    setLoading(true);
    setResult(null);
    setJob(null);

    const formData = new FormData();
    if (file) formData.append("file", file);
    if (text) formData.append("text", text);

    try {
      const res = await fetch("/api/scans/jobs", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to queue scan");
      }

      const queuedJobId = data?.job?.id;
      if (!queuedJobId) {
        throw new Error("Missing job id");
      }

      setJob({
        id: queuedJobId,
        status: data.job.status,
        stage: data.job.stage,
        progress: data.job.progress,
        events: [],
        result: null,
      });

      await pollJob(queuedJobId);
    } catch (err: any) {
      setLoading(false);
      toast.error(err.message || "Scan failed");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setText("");
      toast.success(`Attached: ${f.name}`);
    }
  };

  const trySampleText = () => {
    setFile(null);
    setText(
      "Plagiarism is the representation of another author's language, thoughts, ideas, or expressions as one's own original work. In educational contexts, there are differing definitions of plagiarism depending on the institution.\n\nPlagiarism is considered a violation of academic integrity and a breach of journalistic ethics. It is subject to sanctions such as penalties, suspension, expulsion from school or work, substantial fines and even incarceration.\n\nThe concept of plagiarism as a form of theft originated in the 1st century. It was not until the Enlightenment era that the idea of intellectual property was established and authors could earn money from their creative work.\n\nModern plagiarism detection tools use sophisticated algorithms including n-gram analysis, fingerprinting, and machine learning to identify copied content across billions of documents."
    );
  };

  if (result) {
    return (
      <div className="max-w-full mx-auto flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-extrabold text-slate-900">Analysis Workspace</h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setResult(null);
                setJob(null);
              }}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              New Scan
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl hover:from-emerald-400 hover:to-cyan-400 transition"
            >
              Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-400">Similarity</p>
            <p className="text-xl font-black text-red-500">{result.similarityScore.toFixed(1)}%</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-400">Semantic</p>
            <p className="text-xl font-black text-violet-600">{(result.semanticScore || 0).toFixed(1)}%</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-400">Citation</p>
            <p className="text-xl font-black text-blue-600">{(result.citationScore || 0).toFixed(1)}%</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-400">Writing</p>
            <p className="text-xl font-black text-emerald-600">{(result.writingScore || 0).toFixed(1)}%</p>
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
          aiDetection={result.aiDetection as any}
          paraphraseAnalysis={result.paraphraseAnalysis}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8 mt-4">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Plagiarism & AI Checker</h1>
        <p className="text-slate-500">Queue-powered scanning with real-time progress, semantic matching, citation checks, and writing improvements.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col min-h-[450px] overflow-hidden">
        <div className="flex-1 p-6">
          <textarea
            className="w-full h-full min-h-[300px] resize-none outline-none text-[15px] text-slate-800 placeholder-slate-400 leading-relaxed bg-transparent"
            placeholder={file ? `${file.name} attached - click Scan to analyze.` : "Type, paste, or upload your text here...\n\nMinimum 50 words required."}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setFile(null);
            }}
            disabled={!!file || loading}
          />
        </div>

        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading || (!text && !file)}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-full hover:from-emerald-400 hover:to-cyan-400 transition shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            {loading ? "Queued Scan..." : "Start Deep Scan"}
          </button>
          <input type="file" accept=".txt,.pdf,.docx" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 border border-slate-300 text-slate-600 bg-white font-medium rounded-full hover:bg-slate-50 transition text-sm flex items-center gap-1.5"
          >
            Upload
          </button>
          {!text && !file && (
            <button onClick={trySampleText} className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-semibold">
              Try sample
            </button>
          )}
          {file && (
            <button onClick={() => setFile(null)} className="ml-auto text-xs text-red-600 hover:text-red-800 font-semibold">
              Remove
            </button>
          )}
          {text && <span className="ml-auto text-xs text-slate-400">{text.trim().split(/\s+/).filter(Boolean).length} words</span>}
        </div>
      </div>

      {loading && job && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700">Stage: {prettyStage(job.stage)}</p>
            <p className="text-sm font-semibold text-slate-500">{job.progress}%</p>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all" style={{ width: `${job.progress}%` }} />
          </div>
          <div className="mt-3 text-xs text-slate-500 space-y-1 max-h-28 overflow-y-auto">
            {job.events.slice(-6).map((e) => (
              <p key={e.id}>- [{prettyStage(e.stage)}] {e.message}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
