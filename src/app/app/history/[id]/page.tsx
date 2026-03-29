import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import PrintButton from "@/components/PrintButton";

export default async function ReportPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const scan = await prisma.scan.findUnique({
    where: { id: params.id },
    include: {
      matches: {
        include: { sourceDocument: true },
      },
    },
  });

  if (!scan || scan.userId !== session.user.id) notFound();

  // Build highlighted text
  const allRanges: { start: number; end: number }[] = [];
  scan.matches.forEach((m) => {
    try {
      const parsed = JSON.parse(m.matchRanges);
      if (Array.isArray(parsed)) allRanges.push(...parsed);
    } catch {}
  });
  allRanges.sort((a, b) => a.start - b.start);

  // Merge overlapping ranges
  const merged: { start: number; end: number }[] = [];
  for (const r of allRanges) {
    if (!merged.length) merged.push({ ...r });
    else {
      const last = merged[merged.length - 1];
      if (r.start <= last.end) last.end = Math.max(last.end, r.end);
      else merged.push({ ...r });
    }
  }

  // Build fragments
  const fragments: { text: string; highlighted: boolean }[] = [];
  let li = 0;
  for (const rng of merged) {
    if (rng.start > li) fragments.push({ text: scan.text.slice(li, rng.start), highlighted: false });
    fragments.push({ text: scan.text.slice(rng.start, rng.end), highlighted: true });
    li = rng.end;
  }
  if (li < scan.text.length) fragments.push({ text: scan.text.slice(li), highlighted: false });

  const simColor = scan.similarityScore > 30 ? "text-red-500" : scan.similarityScore > 10 ? "text-amber-500" : "text-emerald-500";

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <div>
          <Link href="/app/history" className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold">← Back to History</Link>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Scan Report</h1>
          <p className="text-xs text-slate-400 mt-1">
            {new Date(scan.createdAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center shadow-sm">
          <p className={`text-3xl font-black ${simColor}`}>{scan.similarityScore.toFixed(1)}%</p>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Similarity</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center shadow-sm">
          <p className="text-3xl font-black text-emerald-500">{scan.originalityScore.toFixed(1)}%</p>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Originality</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center shadow-sm">
          <p className="text-3xl font-black text-slate-800">{scan.wordCount}</p>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Words</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center shadow-sm">
          <p className="text-3xl font-black text-slate-800">{scan.matches.length}</p>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Sources</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Document with highlights */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-base">📄</span> Document
          </h2>
          <div className="text-[15px] leading-relaxed text-slate-700 whitespace-pre-wrap">
            {fragments.map((f, i) =>
              f.highlighted ? (
                <mark key={i} className="bg-red-200 text-red-900 rounded-sm px-0.5">{f.text}</mark>
              ) : (
                <span key={i}>{f.text}</span>
              )
            )}
          </div>
        </div>

        {/* Matched Sources */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="text-base">📚</span> Matched Sources
            </h3>
            {scan.matches.length === 0 ? (
              <div className="py-6 text-center bg-emerald-50/60 rounded-xl border border-emerald-100">
                <span className="text-2xl block mb-1">✅</span>
                <p className="text-sm font-bold text-emerald-800">No matches found</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {scan.matches.map((m, idx) => (
                  <li key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm text-slate-700 break-all">{m.sourceDocument.name}</span>
                      <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                        {m.matchPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Heatmap Legend */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-3 text-sm">Highlight Legend</h3>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-3 rounded bg-red-200 border border-red-300" /> Matched text
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-3 rounded bg-white border border-slate-200" /> Original text
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
