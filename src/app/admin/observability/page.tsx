"use client";

import { useEffect, useState } from "react";

type Observability = {
  jobs24h: number;
  failures24h: number;
  failureRate: number;
  avgStageTimeMs: number;
  stageCounts: { stage: string; count: number }[];
  recentErrors: { id: string; error: string | null; stage: string; updatedAt: string; fileName?: string | null }[];
};

export default function ObservabilityPage() {
  const [data, setData] = useState<Observability | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/admin/observability", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setData(json);
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Observability Dashboard</h1>
        <p className="text-sm text-slate-500">Track queue throughput, failures, and stage latency.</p>
      </div>

      {loading || !data ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-sm text-slate-500">Loading metrics...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard title="Jobs (24h)" value={String(data.jobs24h)} />
            <MetricCard title="Failures (24h)" value={String(data.failures24h)} />
            <MetricCard title="Failure Rate" value={`${data.failureRate}%`} />
            <MetricCard title="Avg Stage Time" value={`${data.avgStageTimeMs}ms`} />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-3">Stage Activity</h2>
            <div className="space-y-2">
              {data.stageCounts.map((s) => (
                <div key={s.stage} className="flex items-center gap-3">
                  <span className="w-28 text-xs text-slate-500">{s.stage}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${Math.min(100, s.count)}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-3">Recent Errors</h2>
            {data.recentErrors.length === 0 ? (
              <p className="text-sm text-slate-500">No recent errors.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.recentErrors.map((e) => (
                  <li key={e.id} className="p-3 bg-rose-50 border border-rose-100 rounded-lg">
                    <p className="font-semibold text-rose-700">{e.error || "Unknown error"}</p>
                    <p className="text-xs text-slate-500 mt-1">Stage: {e.stage} {e.fileName ? `| File: ${e.fileName}` : ""}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-400 uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-black text-slate-800 mt-1">{value}</p>
    </div>
  );
}
