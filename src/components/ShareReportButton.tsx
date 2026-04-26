"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export default function ShareReportButton({ scanId }: { scanId: string }) {
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/scans/${scanId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays: 30 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate share link");

      const shareUrl = `${window.location.origin}${data.shareUrl}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied");
    } catch (error: any) {
      toast.error(error?.message || "Failed to share report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
    >
      {loading ? "Generating..." : "Share"}
    </button>
  );
}
