"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error("Passwords don't match"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setDone(true);
      toast.success("Password reset successfully!");
      setTimeout(() => router.push("/auth/login"), 3000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Invalid link</h1>
        <p className="text-slate-400">This reset link is invalid or has expired.</p>
        <Link href="/auth/forgot-password" className="inline-block mt-4 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:from-amber-400 hover:to-orange-400 transition">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
          <span className="text-3xl">✅</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Password reset!</h1>
        <p className="text-slate-400">Your password has been updated. Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-extrabold text-white mb-2">Choose new password</h1>
      <p className="text-slate-400 mb-8">Enter a strong password for your account.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">New Password</label>
          <input
            id="new-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
            placeholder="Minimum 6 characters"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Confirm Password</label>
          <input
            id="confirm-new-password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl bg-white/5 border text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition ${
              confirmPassword && password !== confirmPassword
                ? "border-red-500/50 focus:ring-red-500/30"
                : "border-white/10 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            }`}
            placeholder="••••••••"
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-red-400 text-xs mt-1">Passwords don&apos;t match</p>
          )}
        </div>
        <button
          type="submit"
          id="reset-password-btn"
          disabled={loading}
          className="w-full py-3.5 font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Resetting…</>
          ) : (
            "Reset Password"
          )}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-center items-center flex-1 px-12 relative">
        <div className="absolute top-8 left-8">
          <Link href="/"><img src="/logo.png" alt="VerifyIQ Logo" className="h-20 w-auto" /></Link>
        </div>
        <div className="absolute -top-20 right-0 w-96 h-96 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />
        <h2 className="text-4xl font-black text-white leading-tight mb-4">
          Secure your<br />
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">account.</span>
        </h2>
        <p className="text-slate-400 text-lg max-w-sm">
          Choose a strong password to keep your VerifyIQ account protected.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link href="/"><img src="/logo.png" alt="VerifyIQ Logo" className="h-16 w-auto" /></Link>
          </div>

          <Suspense fallback={<div className="text-white text-center">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>

          <p className="text-sm text-slate-500 mt-6 text-center">
            Remember your password?{" "}
            <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300 font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
