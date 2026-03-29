"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

type CoachTask = {
  id: string;
  type: "citation" | "rewrite" | "reference" | "boilerplate" | "quote";
  description: string;
  section: string;
  impact: number; // % improvement if fixed
  completed: boolean;
};

type ScanData = {
  id: string;
  text: string;
  similarityScore: number;
  originalityScore: number;
  createdAt: string;
};

export default function CoachPage() {
  const [scans, setScans] = useState<ScanData[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanData | null>(null);
  const [tasks, setTasks] = useState<CoachTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [originalScore, setOriginalScore] = useState(0);
  const [improvedScore, setImprovedScore] = useState(0);

  // Fetch user scans
  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scans");
      if (res.ok) {
        const data = await res.json();
        setScans(data);
        if (data.length > 0) {
          selectScan(data[0]);
        }
      }
    } catch {}
    setLoading(false);
  };

  const selectScan = (scan: ScanData) => {
    setSelectedScan(scan);
    setOriginalScore(scan.originalityScore);
    setImprovedScore(scan.originalityScore);
    generateTasks(scan);
  };

  const generateTasks = (scan: ScanData) => {
    const sentences = scan.text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 10);
    const generatedTasks: CoachTask[] = [];
    let taskId = 0;

    // Find claim-like sentences (sentences with data/facts that need citations)
    const claimPatterns = /\b(studies show|research indicates|according to|evidence suggests|data shows|statistics|percent|million|billion|found that|proven|established)\b/i;
    sentences.forEach((s, i) => {
      if (claimPatterns.test(s)) {
        generatedTasks.push({
          id: `t${taskId++}`,
          type: "citation",
          description: `Add citation for: "${s.substring(0, 80)}…"`,
          section: `Sentence ${i + 1}`,
          impact: 3,
          completed: false,
        });
      }
    });

    // Identify close-to-source paragraphs (simulated)
    const paragraphs = scan.text.split(/\n{2,}/).filter((p) => p.trim().length > 20);
    paragraphs.forEach((p, i) => {
      if (scan.similarityScore > 10) {
        generatedTasks.push({
          id: `t${taskId++}`,
          type: "rewrite",
          description: `Rewrite paragraph ${i + 1}: "${p.substring(0, 60)}…"`,
          section: `¶ ${i + 1}`,
          impact: Math.round(scan.similarityScore / paragraphs.length),
          completed: false,
        });
      }
    });

    // Check for missing references section
    if (!scan.text.toLowerCase().includes("references") && !scan.text.toLowerCase().includes("bibliography")) {
      generatedTasks.push({
        id: `t${taskId++}`,
        type: "reference",
        description: "Add a References / Bibliography section at the end of your document.",
        section: "End",
        impact: 5,
        completed: false,
      });
    }

    // Check for boilerplate
    const commonPhrases = ["in conclusion", "it is important to note", "in this paper we", "the purpose of this"];
    commonPhrases.forEach((phrase) => {
      if (scan.text.toLowerCase().includes(phrase)) {
        generatedTasks.push({
          id: `t${taskId++}`,
          type: "boilerplate",
          description: `Reduce boilerplate: replace "${phrase}" with more specific language.`,
          section: "Various",
          impact: 1,
          completed: false,
        });
      }
    });

    // Quote suggestion
    if (scan.similarityScore > 20) {
      generatedTasks.push({
        id: `t${taskId++}`,
        type: "quote",
        description: "Consider using direct quotes with quotation marks for any exact copied passages.",
        section: "Various",
        impact: 8,
        completed: false,
      });
    }

    setTasks(generatedTasks);
  };

  const toggleTask = (id: string) => {
    setTasks((prev) => {
      const updated = prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t);
      // Calculate improved score
      const completedImpact = updated.filter((t) => t.completed).reduce((acc, t) => acc + t.impact, 0);
      setImprovedScore(Math.min(100, originalScore + completedImpact));
      return updated;
    });
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const typeIcon = (type: CoachTask["type"]) => {
    switch (type) {
      case "citation": return "📎";
      case "rewrite": return "✏️";
      case "reference": return "📚";
      case "boilerplate": return "🧹";
      case "quote": return "💬";
    }
  };

  const typeColor = (type: CoachTask["type"]) => {
    switch (type) {
      case "citation": return "bg-blue-100 text-blue-700";
      case "rewrite": return "bg-violet-100 text-violet-700";
      case "reference": return "bg-emerald-100 text-emerald-700";
      case "boilerplate": return "bg-amber-100 text-amber-700";
      case "quote": return "bg-rose-100 text-rose-700";
    }
  };

  // Badges
  const badges = [];
  if (improvedScore >= 90) badges.push({ icon: "🏆", label: "Originality Champion" });
  if (completedCount >= 5) badges.push({ icon: "📎", label: "Citation Master" });
  if (progress === 100 && tasks.length > 0) badges.push({ icon: "⭐", label: "All Tasks Complete" });
  if (improvedScore > originalScore + 10) badges.push({ icon: "📈", label: "Big Improver" });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Originality Coach</h1>
          <p className="text-slate-500 text-sm mt-1">Your personalized improvement plan based on scan results.</p>
        </div>
        <Link href="/app/check"
          className="px-5 py-2 text-sm font-bold rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 transition shadow">
          + New Scan
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : !selectedScan ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <span className="text-5xl block mb-4">📝</span>
          <p className="font-bold text-slate-700 text-lg">No scans yet</p>
          <p className="text-slate-500 text-sm mt-2">Run a plagiarism scan first to get your improvement plan.</p>
        </div>
      ) : (
        <>
          {/* Progress Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase">Originality Progress</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-slate-400 line-through text-lg">{originalScore.toFixed(0)}%</span>
                <span className="text-emerald-500 text-3xl font-black">→ {improvedScore.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-3 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-2 rounded-full transition-all duration-500" style={{ width: `${improvedScore}%` }} />
              </div>
              {improvedScore > originalScore && (
                <p className="text-xs text-emerald-600 font-medium mt-2">+{(improvedScore - originalScore).toFixed(0)}% improvement if you complete marked tasks</p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase">Task Progress</span>
              <p className="text-3xl font-black text-slate-800 mt-2">{completedCount}/{tasks.length}</p>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-3 overflow-hidden">
                <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-2">{progress}% complete</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase">Badges Earned</span>
              {badges.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-3">
                  {badges.map((b, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full">
                      {b.icon} {b.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 mt-3">Complete tasks to earn badges!</p>
              )}
            </div>
          </div>

          {/* Task summary by type */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {(["citation", "rewrite", "reference", "boilerplate", "quote"] as const).map((type) => {
              const count = tasks.filter((t) => t.type === type).length;
              if (count === 0) return null;
              return (
                <span key={type} className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full ${typeColor(type)}`}>
                  {typeIcon(type)} {count} {type}
                </span>
              );
            })}
          </div>

          {/* Task List */}
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id}
                className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-all hover:shadow-sm ${
                  task.completed ? "border-emerald-200 bg-emerald-50/30 opacity-70" : "border-slate-200"
                }`}>
                <button onClick={() => toggleTask(task.id)}
                  className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${
                    task.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-emerald-400"
                  }`}>
                  {task.completed && <span className="text-xs">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColor(task.type)}`}>
                      {typeIcon(task.type)} {task.type}
                    </span>
                    <span className="text-[10px] text-slate-400">{task.section}</span>
                  </div>
                  <p className={`text-sm text-slate-700 ${task.completed ? "line-through" : ""}`}>{task.description}</p>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold whitespace-nowrap bg-emerald-50 px-2 py-0.5 rounded-full">
                  +{task.impact}%
                </span>
              </div>
            ))}
          </div>

          {tasks.length === 0 && (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-8 text-center">
              <span className="text-4xl block mb-3">🎉</span>
              <p className="font-bold text-emerald-800">Your document looks great!</p>
              <p className="text-sm text-emerald-600 mt-1">No improvement tasks detected. Keep up the great work.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
