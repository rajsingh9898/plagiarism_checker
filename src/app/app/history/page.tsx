import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const scans = await prisma.scan.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { matches: true },
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Scan History</h1>
          <p className="text-slate-500 text-sm mt-1">{scans.length} scan{scans.length !== 1 ? "s" : ""} total</p>
        </div>
        <Link href="/app/check"
          className="px-5 py-2.5 text-sm font-bold rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 transition shadow">
          + New Scan
        </Link>
      </div>

      {scans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <span className="text-5xl block mb-4">📝</span>
          <p className="font-bold text-slate-700 text-lg">No scans yet</p>
          <p className="text-slate-500 text-sm mt-2">Start your first scan to see results here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scans.map((scan) => {
            const simColor = scan.similarityScore > 30 ? "text-red-500" : scan.similarityScore > 10 ? "text-amber-500" : "text-emerald-500";
            return (
              <Link key={scan.id} href={`/app/history/${scan.id}`}
                className="block bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 font-medium truncate group-hover:text-emerald-700 transition">
                      {scan.text.substring(0, 120)}…
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
                      <span>{scan.wordCount} words</span>
                      <span>•</span>
                      <span>{scan.matches.length} source{scan.matches.length !== 1 ? "s" : ""} matched</span>
                      <span>•</span>
                      <span>{new Date(scan.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      <span>•</span>
                      <span className="text-violet-500 font-semibold">Semantic {(scan.semanticScore ?? 0).toFixed(0)}%</span>
                      <span>•</span>
                      <span className="text-blue-500 font-semibold">Citation {(scan.citationScore ?? 0).toFixed(0)}%</span>
                      <span>•</span>
                      <span className="text-emerald-500 font-semibold">Writing {(scan.writingScore ?? 0).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className={`text-lg font-black ${simColor}`}>{scan.similarityScore.toFixed(1)}%</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">similarity</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-emerald-500">{scan.originalityScore.toFixed(1)}%</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">original</p>
                    </div>
                    <span className="text-slate-300 group-hover:text-slate-500 transition ml-2">→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
