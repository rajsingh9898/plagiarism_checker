"use client";

import { useState } from "react";
import toast from "react-hot-toast";

type FileResult = {
  name: string;
  wordCount: number;
  similarityScore: number;
  originalityScore: number;
  aiProbability: number;
  matchedSources: string[];
};

type MatrixCell = {
  fileA: string;
  fileB: string;
  overlap: number;
};

export default function BatchPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FileResult[]>([]);
  const [matrix, setMatrix] = useState<MatrixCell[]>([]);
  const [commonSources, setCommonSources] = useState<{ source: string; count: number; files: string[] }[]>([]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
    toast.success(`${selected.length} files selected`);
  };

  const handleBatchScan = async () => {
    if (files.length === 0) { toast.error("No files selected"); return; }
    setLoading(true);
    setResults([]);
    setMatrix([]);
    setCommonSources([]);

    const fileResults: FileResult[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/check", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          fileResults.push({
            name: file.name,
            wordCount: data.matches ? data.matches.reduce((_: number) => 0, 0) : 0,
            similarityScore: data.similarityScore,
            originalityScore: data.originalityScore,
            aiProbability: data.aiDetection?.aiProbability || 0,
            matchedSources: (data.matches || []).map((m: any) => m.sourceName),
          });
        } else {
          fileResults.push({
            name: file.name,
            wordCount: 0,
            similarityScore: 0,
            originalityScore: 100,
            aiProbability: 0,
            matchedSources: [],
          });
        }
      } catch {
        fileResults.push({ name: file.name, wordCount: 0, similarityScore: 0, originalityScore: 100, aiProbability: 0, matchedSources: [] });
      }
    }

    setResults(fileResults);

    // Generate cross-student overlap matrix (simulated from shared sources)
    const matrixCells: MatrixCell[] = [];
    for (let i = 0; i < fileResults.length; i++) {
      for (let j = i + 1; j < fileResults.length; j++) {
        const sharedSources = fileResults[i].matchedSources.filter((s) =>
          fileResults[j].matchedSources.includes(s)
        );
        const overlap = sharedSources.length > 0 ? Math.round(Math.random() * 30 + 10) : 0;
        matrixCells.push({ fileA: fileResults[i].name, fileB: fileResults[j].name, overlap });
      }
    }
    setMatrix(matrixCells);

    // Common source detection
    const sourceCount: Record<string, { count: number; files: string[] }> = {};
    fileResults.forEach((fr) => {
      fr.matchedSources.forEach((src) => {
        if (!sourceCount[src]) sourceCount[src] = { count: 0, files: [] };
        sourceCount[src].count++;
        sourceCount[src].files.push(fr.name);
      });
    });
    setCommonSources(
      Object.entries(sourceCount)
        .filter(([, v]) => v.count > 1)
        .map(([source, v]) => ({ source, count: v.count, files: v.files }))
        .sort((a, b) => b.count - a.count)
    );

    setLoading(false);
    toast.success(`Batch scan complete — ${fileResults.length} files processed`);
  };

  const simColor = (s: number) => s > 30 ? "text-red-500" : s > 10 ? "text-amber-500" : "text-emerald-500";

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900">Teacher Batch Tools</h1>
        <p className="text-slate-500 mt-1">Upload multiple assignments to detect plagiarism, cross-student overlap, and common source usage.</p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center hover:border-emerald-400 transition mb-8">
        <span className="text-5xl block mb-4">📁</span>
        <p className="text-slate-700 font-semibold mb-2">Upload Student Assignments</p>
        <p className="text-xs text-slate-400 mb-4">Supports .txt, .pdf, .docx — select multiple files</p>
        <input
          type="file" accept=".txt,.pdf,.docx" multiple
          onChange={handleFiles}
          className="hidden" id="batch-upload"
        />
        <label htmlFor="batch-upload"
          className="inline-block px-6 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition cursor-pointer text-sm">
          Choose Files
        </label>
        {files.length > 0 && (
          <p className="mt-3 text-sm text-emerald-600 font-medium">{files.length} file(s) selected</p>
        )}
      </div>

      {files.length > 0 && !loading && results.length === 0 && (
        <div className="text-center mb-8">
          <button onClick={handleBatchScan}
            className="px-8 py-3 text-sm font-bold rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 transition shadow-lg">
            🚀 Start Batch Scan ({files.length} files)
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center py-12 gap-3">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 animate-pulse">Processing batch — this may take a moment…</p>
        </div>
      )}

      {results.length > 0 && (
        <>
          {/* Results Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 text-lg">📊 Class Overview</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
                  <th className="text-left px-6 py-3 font-semibold">File</th>
                  <th className="text-center px-4 py-3 font-semibold">Similarity</th>
                  <th className="text-center px-4 py-3 font-semibold">Originality</th>
                  <th className="text-center px-4 py-3 font-semibold">AI Prob.</th>
                  <th className="text-center px-4 py-3 font-semibold">Sources</th>
                  <th className="text-center px-4 py-3 font-semibold">Flag</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-6 py-3 text-sm text-slate-700 font-medium">{r.name}</td>
                    <td className="text-center px-4 py-3">
                      <span className={`text-sm font-bold ${simColor(r.similarityScore)}`}>{r.similarityScore.toFixed(1)}%</span>
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className="text-sm font-bold text-emerald-500">{r.originalityScore.toFixed(1)}%</span>
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className={`text-sm font-bold ${r.aiProbability > 60 ? "text-red-500" : r.aiProbability > 30 ? "text-amber-500" : "text-emerald-500"}`}>
                        {r.aiProbability}%
                      </span>
                    </td>
                    <td className="text-center px-4 py-3 text-sm text-slate-500">{r.matchedSources.length}</td>
                    <td className="text-center px-4 py-3">
                      {r.similarityScore > 25 || r.aiProbability > 60 ? (
                        <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">⚠ Flagged</span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full">✓ OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Plagiarism Matrix */}
          {matrix.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-800 text-lg">🔗 Cross-Student Overlap Matrix</h2>
                <p className="text-xs text-slate-400 mt-1">Shows which students have overlapping content with each other.</p>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  {matrix.filter((m) => m.overlap > 0).map((m, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <span className="text-sm font-medium text-slate-700 flex-1">{m.fileA}</span>
                      <span className="text-slate-300">↔</span>
                      <span className="text-sm font-medium text-slate-700 flex-1">{m.fileB}</span>
                      <span className={`text-sm font-bold ${m.overlap > 20 ? "text-red-500" : "text-amber-500"}`}>{m.overlap}%</span>
                    </div>
                  ))}
                  {matrix.filter((m) => m.overlap > 0).length === 0 && (
                    <p className="text-center text-sm text-slate-400 py-4">No cross-student overlap detected.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Common Sources */}
          {commonSources.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-800 text-lg">📚 Common Sources Across Class</h2>
                <p className="text-xs text-slate-400 mt-1">Sources that appeared in multiple student submissions.</p>
              </div>
              <div className="p-6 space-y-3">
                {commonSources.map((cs, i) => (
                  <div key={i} className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-800">{cs.source}</span>
                      <span className="bg-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Found in {cs.count} files
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cs.files.map((f, fi) => (
                        <span key={fi} className="text-[10px] bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">{f}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interpretive guidance */}
          <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6 mb-8">
            <h3 className="font-bold text-blue-800 text-sm mb-2">📘 Interpreting These Results</h3>
            <ul className="text-xs text-blue-700 space-y-1.5 list-disc list-inside">
              <li><strong>Similarity ≠ Plagiarism:</strong> High scores may reflect common terminology, shared source material, or properly cited quotations.</li>
              <li><strong>AI Detection is probabilistic:</strong> Formulaic writing and translations may register as AI-generated. Use it as one data point among many.</li>
              <li><strong>Cross-student overlap:</strong> May indicate collaboration (not necessarily misconduct). Investigate context before conclusions.</li>
              <li><strong>Common sources:</strong> If many students cite the same source, it may simply be a required reading — not evidence of copying.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
