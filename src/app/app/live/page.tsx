"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";

type ParagraphResult = {
  id: number;
  text: string;
  risk: "low" | "medium" | "high" | "scanning" | "pending";
  similarity: number;
  lastScanned: Date | null;
  changed: boolean;
};

export default function LiveEditorPage() {
  const [paragraphs, setParagraphs] = useState<ParagraphResult[]>([]);
  const [rawText, setRawText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanStage, setScanStage] = useState<"idle" | "uploading" | "processing" | "analyzing" | "done">("idle");
  const [overallSimilarity, setOverallSimilarity] = useState<number | null>(null);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [autoScan, setAutoScan] = useState(true);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Parse text into paragraphs
  const parseParagraphs = useCallback((text: string): ParagraphResult[] => {
    if (!text.trim()) return [];
    return text.split(/\n{2,}/).filter((p) => p.trim().length > 0).map((p, i) => ({
      id: i,
      text: p.trim(),
      risk: "pending",
      similarity: 0,
      lastScanned: null,
      changed: true,
    }));
  }, []);

  // Debounced auto-scan
  useEffect(() => {
    if (!autoScan || !rawText.trim() || rawText.trim().split(/\s+/).length < 50) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleScan();
    }, 2000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [rawText, autoScan]);

  // Handle text change
  const handleTextChange = (text: string) => {
    setRawText(text);
    const newParas = parseParagraphs(text);
    setParagraphs((prev) => {
      return newParas.map((np, i) => {
        const existing = prev[i];
        if (existing && existing.text === np.text) {
          return { ...existing, id: i, changed: false };
        }
        return { ...np, changed: true };
      });
    });
  };

  // Scan
  const handleScan = async () => {
    const wordCount = rawText.trim().split(/\s+/).length;
    if (wordCount < 50) { toast.error("Minimum 50 words required."); return; }

    setScanning(true);
    setScanStage("uploading");

    // Mark changed paragraphs as scanning
    setParagraphs((prev) => prev.map((p) => p.changed || !p.lastScanned ? { ...p, risk: "scanning" } : p));

    await new Promise((r) => setTimeout(r, 400));
    setScanStage("processing");

    const formData = new FormData();
    formData.append("text", rawText);

    try {
      await new Promise((r) => setTimeout(r, 300));
      setScanStage("analyzing");

      const res = await fetch("/api/check", { method: "POST", body: formData });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Scan failed"); }
      const data = await res.json();

      setOverallSimilarity(data.similarityScore);
      setLastScanTime(new Date());

      // Distribute match ranges to paragraphs
      const allRanges = (data.matches || []).flatMap((m: any) => m.matchRanges || []);
      let offset = 0;
      const updatedParas = parseParagraphs(rawText).map((p, i) => {
        const pStart = rawText.indexOf(p.text, offset);
        const pEnd = pStart + p.text.length;
        offset = pEnd;

        const matchedChars = allRanges
          .filter((r: any) => r.start < pEnd && r.end > pStart)
          .reduce((acc: number, r: any) => {
            const overlapStart = Math.max(r.start, pStart);
            const overlapEnd = Math.min(r.end, pEnd);
            return acc + Math.max(0, overlapEnd - overlapStart);
          }, 0);

        const sim = p.text.length > 0 ? Math.round((matchedChars / p.text.length) * 100) : 0;
        const risk = sim > 30 ? "high" : sim > 10 ? "medium" : "low";

        return { ...p, similarity: sim, risk: risk as ParagraphResult["risk"], lastScanned: new Date(), changed: false };
      });

      setParagraphs(updatedParas);
      setScanStage("done");
      toast.success("Live scan complete!");
    } catch (err: any) {
      toast.error(err.message);
      setParagraphs((prev) => prev.map((p) => p.risk === "scanning" ? { ...p, risk: "pending" } : p));
      setScanStage("idle");
    } finally {
      setScanning(false);
      setTimeout(() => setScanStage("idle"), 2000);
    }
  };

  const riskBadge = (risk: ParagraphResult["risk"], sim: number) => {
    switch (risk) {
      case "high": return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700">⚠ {sim}% match</span>;
      case "medium": return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700">⚡ {sim}% match</span>;
      case "low": return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">✓ Clear</span>;
      case "scanning": return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700 animate-pulse">⏳ Scanning…</span>;
      case "pending": return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-500">— Pending</span>;
    }
  };

  const stageSteps = [
    { key: "uploading", label: "Upload", icon: "📤" },
    { key: "processing", label: "Process", icon: "⚙️" },
    { key: "analyzing", label: "Analyze", icon: "🔍" },
    { key: "done", label: "Done", icon: "✅" },
  ];
  const stageIdx = stageSteps.findIndex((s) => s.key === scanStage);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Live Editor</h1>
          <p className="text-slate-500 text-sm mt-1">Write or paste text — get real-time plagiarism risk per paragraph.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={autoScan} onChange={(e) => setAutoScan(e.target.checked)} className="accent-emerald-500 rounded" />
            Auto-scan
          </label>
          {lastScanTime && (
            <span className="text-[10px] text-slate-400">
              Last: {lastScanTime.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Scan Pipeline Stepper */}
      {scanStage !== "idle" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            {stageSteps.map((step, i) => (
              <div key={step.key} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 ${i <= stageIdx ? "text-emerald-600" : "text-slate-300"}`}>
                  <span className={`text-xl ${i === stageIdx ? "animate-bounce" : ""}`}>{step.icon}</span>
                  <span className={`text-xs font-bold ${i <= stageIdx ? "text-emerald-700" : "text-slate-400"}`}>{step.label}</span>
                </div>
                {i < stageSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 rounded ${i < stageIdx ? "bg-emerald-400" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall Score */}
      {overallSimilarity !== null && (
        <div className="flex gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex-1 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-400 uppercase">Overall Similarity</span>
              <span className={`text-2xl font-black ${overallSimilarity > 30 ? "text-red-500" : overallSimilarity > 10 ? "text-amber-500" : "text-emerald-500"}`}>
                {overallSimilarity.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div className={`h-2 rounded-full transition-all duration-700 ${overallSimilarity > 30 ? "bg-red-500" : overallSimilarity > 10 ? "bg-amber-400" : "bg-emerald-500"}`}
                style={{ width: `${overallSimilarity}%` }} />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex-1 shadow-sm text-center">
            <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Paragraphs</span>
            <div className="flex justify-center gap-4 text-sm">
              <span className="text-emerald-600 font-bold">{paragraphs.filter((p) => p.risk === "low").length} Clear</span>
              <span className="text-amber-500 font-bold">{paragraphs.filter((p) => p.risk === "medium").length} Medium</span>
              <span className="text-red-500 font-bold">{paragraphs.filter((p) => p.risk === "high").length} High</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Editor */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="flex-1 p-6">
            <textarea
              className="w-full h-full min-h-[400px] resize-none outline-none text-[15px] text-slate-800 placeholder-slate-400 leading-relaxed bg-transparent"
              placeholder="Start typing or paste your text here…&#10;&#10;Separate paragraphs with blank lines for per-section analysis.&#10;Minimum 50 words. Auto-scan triggers after 2 seconds of inactivity."
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              disabled={scanning}
            />
          </div>
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 flex items-center gap-3">
            <button onClick={handleScan} disabled={scanning || rawText.trim().split(/\s+/).length < 50}
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-full text-sm hover:from-emerald-400 hover:to-cyan-400 transition shadow disabled:opacity-40 flex items-center gap-2">
              {scanning ? (<><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Scanning…</>) : "🔍 Scan Now"}
            </button>
            <span className="ml-auto text-xs text-slate-400">{rawText.trim().split(/\s+/).filter(Boolean).length} words</span>
          </div>
        </div>

        {/* Paragraph Risk Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-800 text-sm">Paragraph Risk Map</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{paragraphs.length} section{paragraphs.length !== 1 ? "s" : ""} detected</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {paragraphs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <span className="text-3xl block mb-2">✍️</span>
                Start writing to see paragraph-level risk analysis.
              </div>
            ) : (
              paragraphs.map((p) => (
                <div key={p.id} className={`rounded-xl p-3 border transition ${
                  p.risk === "high" ? "border-red-200 bg-red-50/50" :
                  p.risk === "medium" ? "border-amber-200 bg-amber-50/50" :
                  p.risk === "low" ? "border-emerald-200 bg-emerald-50/30" :
                  "border-slate-200 bg-slate-50/50"
                }`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold text-slate-400">¶ {p.id + 1}</span>
                    {riskBadge(p.risk, p.similarity)}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{p.text}</p>
                  {p.lastScanned && (
                    <p className="text-[9px] text-slate-400 mt-1">Scanned {p.lastScanned.toLocaleTimeString()}</p>
                  )}
                  {p.changed && p.lastScanned && (
                    <p className="text-[9px] text-blue-500 font-medium mt-0.5">✎ Modified since last scan</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
