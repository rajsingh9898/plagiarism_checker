"use client";

import { useState } from "react";
import toast from "react-hot-toast";

type Policy = {
  id: string;
  name: string;
  maxSimilarity: number;
  citationStyle: "APA" | "MLA" | "Chicago" | "Any";
  ignoreQuotes: boolean;
  ignoreReferences: boolean;
  ignoreBoilerplate: boolean;
  maxAiProbability: number;
  rubric: RubricItem[];
  templates: string[];
};

type RubricItem = {
  label: string;
  condition: string;
  feedback: string;
  grade: "A" | "B" | "C" | "D" | "F";
};

const DEFAULT_RUBRIC: RubricItem[] = [
  { label: "Excellent", condition: "similarity < 5% and AI < 20%", feedback: "Outstanding original work with proper citations. Keep it up!", grade: "A" },
  { label: "Good", condition: "similarity < 15% and AI < 40%", feedback: "Mostly original. Consider adding more citations to strengthen your argument.", grade: "B" },
  { label: "Needs work", condition: "similarity < 30% and AI < 60%", feedback: "Significant borrowed content detected. Please rewrite flagged sections and add proper citations.", grade: "C" },
  { label: "Concerning", condition: "similarity < 50% or AI < 80%", feedback: "Heavy reliance on external sources. Please substantially rewrite your submission.", grade: "D" },
  { label: "Unacceptable", condition: "similarity >= 50% or AI >= 80%", feedback: "This submission requires a meeting. Please schedule time to discuss academic integrity.", grade: "F" },
];

export default function PolicyPage() {
  const [policies, setPolicies] = useState<Policy[]>([
    { 
      id: "default",
      name: "Default Academic Policy",
      maxSimilarity: 20,
      citationStyle: "APA",
      ignoreQuotes: true,
      ignoreReferences: true,
      ignoreBoilerplate: true,
      maxAiProbability: 50,
      rubric: DEFAULT_RUBRIC,
      templates: ["This paper was submitted as part of", "I hereby declare that this work"],
    },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState("");

  const editing = policies.find((p) => p.id === editingId);

  const updatePolicy = (id: string, updates: Partial<Policy>) => {
    setPolicies((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p));
  };

  const addPolicy = () => {
    const newId = `policy-${Date.now()}`;
    const newPolicy: Policy = {
      id: newId,
      name: "New Assignment Policy",
      maxSimilarity: 20,
      citationStyle: "APA",
      ignoreQuotes: true,
      ignoreReferences: true,
      ignoreBoilerplate: true,
      maxAiProbability: 50,
      rubric: DEFAULT_RUBRIC,
      templates: [],
    };
    setPolicies((prev) => [...prev, newPolicy]);
    setEditingId(newId);
    toast.success("New policy created");
  };

  const addTemplate = (policyId: string) => {
    if (!newTemplate.trim()) return;
    updatePolicy(policyId, {
      templates: [...(policies.find((p) => p.id === policyId)?.templates || []), newTemplate.trim()],
    });
    setNewTemplate("");
    toast.success("Template added");
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Policy & Rubric Builder</h1>
          <p className="text-slate-500 text-sm mt-1">Set rules, thresholds, and auto-feedback per assignment.</p>
        </div>
        <button onClick={addPolicy}
          className="px-5 py-2 text-sm font-bold rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-400 hover:to-purple-500 transition shadow">
          + New Policy
        </button>
      </div>

      {/* Policy List */}
      {!editingId && (
        <div className="space-y-3">
          {policies.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-all cursor-pointer" onClick={() => setEditingId(p.id)}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">{p.name}</h3>
                  <div className="flex gap-3 mt-2 text-xs text-slate-500">
                    <span>Max similarity: <strong className="text-slate-700">{p.maxSimilarity}%</strong></span>
                    <span>•</span>
                    <span>Max AI: <strong className="text-slate-700">{p.maxAiProbability}%</strong></span>
                    <span>•</span>
                    <span>Citation: <strong className="text-slate-700">{p.citationStyle}</strong></span>
                    <span>•</span>
                    <span>{p.templates.length} template(s)</span>
                  </div>
                </div>
                <span className="text-slate-300 text-xl">→</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Policy Editor */}
      {editing && (
        <>
          <button onClick={() => setEditingId(null)} className="mb-6 text-sm text-violet-600 font-semibold hover:text-violet-800">← Back to policies</button>

          <div className="space-y-6">
            {/* Name */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Policy Name</label>
              <input type="text" value={editing.name} onChange={(e) => updatePolicy(editing.id, { name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
            </div>

            {/* Thresholds */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">📏 Thresholds</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Max Similarity: {editing.maxSimilarity}%</label>
                  <input type="range" min="0" max="100" value={editing.maxSimilarity}
                    onChange={(e) => updatePolicy(editing.id, { maxSimilarity: Number(e.target.value) })}
                    className="w-full accent-red-500" />
                  <div className="flex justify-between text-[9px] text-slate-400 mt-1"><span>0% (strict)</span><span>100% (lenient)</span></div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Max AI Probability: {editing.maxAiProbability}%</label>
                  <input type="range" min="0" max="100" value={editing.maxAiProbability}
                    onChange={(e) => updatePolicy(editing.id, { maxAiProbability: Number(e.target.value) })}
                    className="w-full accent-violet-500" />
                  <div className="flex justify-between text-[9px] text-slate-400 mt-1"><span>0% (no AI)</span><span>100% (allow AI)</span></div>
                </div>
              </div>
            </div>

            {/* Exclusions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">🚫 Exclusions</h3>
              <div className="space-y-3">
                {([
                  ["ignoreQuotes", "Ignore direct quotes (text in quotation marks)"],
                  ["ignoreReferences", "Ignore References/Bibliography section"],
                  ["ignoreBoilerplate", "Ignore registered boilerplate/templates"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={(editing as any)[key]}
                      onChange={(e) => updatePolicy(editing.id, { [key]: e.target.checked })}
                      className="accent-violet-500 rounded w-4 h-4" />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Citation Style */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">📎 Required Citation Style</h3>
              <div className="flex gap-2">
                {(["APA", "MLA", "Chicago", "Any"] as const).map((s) => (
                  <button key={s} onClick={() => updatePolicy(editing.id, { citationStyle: s })}
                    className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
                      editing.citationStyle === s ? "bg-violet-100 text-violet-700 border border-violet-300" : "bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Boilerplate Templates */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">📄 Approved Templates (excluded from scoring)</h3>
              <div className="space-y-2 mb-4">
                {editing.templates.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <span className="text-xs text-slate-600 flex-1 truncate">"{t}"</span>
                    <button onClick={() => {
                      updatePolicy(editing.id, { templates: editing.templates.filter((_, j) => j !== i) });
                      toast.success("Template removed");
                    }} className="text-[10px] text-red-500 font-semibold">Remove</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newTemplate} onChange={(e) => setNewTemplate(e.target.value)}
                  placeholder="Enter text to exclude from scoring…"
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                <button onClick={() => addTemplate(editing.id)}
                  className="px-4 py-2 text-sm font-semibold bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition">
                  Add
                </button>
              </div>
            </div>

            {/* Rubric */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">📋 Auto-Generated Rubric Feedback</h3>
              <div className="space-y-3">
                {editing.rubric.map((r, i) => {
                  const gradeColor: Record<string, string> = { A: "bg-emerald-100 text-emerald-700", B: "bg-blue-100 text-blue-700", C: "bg-amber-100 text-amber-700", D: "bg-orange-100 text-orange-700", F: "bg-red-100 text-red-700" };
                  return (
                    <div key={i} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${gradeColor[r.grade]}`}>Grade {r.grade}</span>
                        <span className="text-sm font-semibold text-slate-800">{r.label}</span>
                        <span className="text-[10px] text-slate-400 ml-auto">{r.condition}</span>
                      </div>
                      <p className="text-xs text-slate-600 italic">"{r.feedback}"</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={() => { setEditingId(null); toast.success("Policy saved!"); }}
              className="w-full py-3 font-bold rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-400 hover:to-purple-500 transition shadow-lg">
              💾 Save Policy
            </button>
          </div>
        </>
      )}
    </div>
  );
}
