import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function SharedReportPage({ params }: { params: { token: string } }) {
  const share = await prisma.sharedReport.findUnique({
    where: { token: params.token },
    include: {
      scan: {
        include: {
          matches: {
            include: { sourceDocument: true },
          },
          user: {
            select: { name: true, email: true },
          },
        },
      },
    },
  });

  if (!share || share.revoked || (share.expiresAt && new Date() > share.expiresAt)) {
    notFound();
  }

  const scan = share.scan;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">Verified Scan Report</h1>
        <p className="text-sm text-slate-500 mt-1">Public verification link</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs text-slate-400">Similarity</p>
            <p className="text-xl font-black text-red-500">{scan.similarityScore.toFixed(1)}%</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs text-slate-400">Originality</p>
            <p className="text-xl font-black text-emerald-500">{scan.originalityScore.toFixed(1)}%</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs text-slate-400">Sources</p>
            <p className="text-xl font-black text-slate-800">{scan.matches.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs text-slate-400">Verification Code</p>
            <p className="text-sm font-black text-slate-800 tracking-wider">{share.verifyCode}</p>
          </div>
        </div>

        <div className="mt-6 text-sm text-slate-600 space-y-1">
          <p><strong>Scan ID:</strong> {scan.id}</p>
          <p><strong>Author:</strong> {scan.user.name || scan.user.email}</p>
          <p><strong>Created:</strong> {new Date(scan.createdAt).toLocaleString()}</p>
          <p><strong>Shared:</strong> {new Date(share.createdAt).toLocaleString()}</p>
          {share.expiresAt && <p><strong>Expires:</strong> {new Date(share.expiresAt).toLocaleString()}</p>}
        </div>

        <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-4">
          <h2 className="text-sm font-bold text-slate-700 mb-2">Matched Sources</h2>
          {scan.matches.length === 0 ? (
            <p className="text-sm text-emerald-600">No matched sources.</p>
          ) : (
            <ul className="space-y-2">
              {scan.matches.map((m) => (
                <li key={m.id} className="flex justify-between text-sm">
                  <span className="text-slate-700">{m.sourceDocument.name}</span>
                  <span className="font-bold text-red-500">{m.matchPercentage.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
