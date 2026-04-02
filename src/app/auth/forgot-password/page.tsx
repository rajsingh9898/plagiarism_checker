"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setSent(true);
      toast.success("Reset link sent!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-center items-center flex-1 px-12 relative">
        <div className="absolute top-8 left-8">
          <Link href="/"><img src="/logo.png" alt="VerifyIQ Logo" className="h-20 w-auto" /></Link>
        </div>
        <div className="absolute -bottom-20 left-0 w-96 h-96 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none" />
        <h2 className="text-4xl font-black text-white leading-tight mb-4">
          Forgot your<br />
          <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">password?</span>
        </h2>
        <p className="text-slate-400 text-lg max-w-sm">
          No worries — we'll send you a secure link to reset it in seconds.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link href="/"><img src="/logo.png" alt="VerifyIQ Logo" className="h-16 w-auto" /></Link>
          </div>

          {!sent ? (
            <>
              <h1 className="text-3xl font-extrabold text-white mb-2">Reset password</h1>
              <p className="text-slate-400 mb-8">Enter the email associated with your account and we'll send a reset link.</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Email Address</label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition"
                    placeholder="you@example.com"
                  />
                </div>
                <button
                  type="submit"
                  id="send-reset-btn"
                  disabled={loading}
                  className="w-full py-3.5 font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 transition shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
                  ) : (
                    "Send Reset Link →"
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
                <span className="text-3xl">📧</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white">Check your inbox</h1>
              <p className="text-slate-400">
                We've sent a password reset link to<br />
                <span className="text-amber-400 font-semibold">{email}</span>
              </p>
              <p className="text-slate-500 text-sm">
                The link expires in 15 minutes. Didn't receive it? Check your spam folder.
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-sm text-amber-400 hover:text-amber-300 font-semibold transition"
              >
                Try a different email
              </button>
            </div>
          )}

          <p className="text-sm text-slate-500 mt-6 text-center">
            Remember your password?{" "}
            <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300 font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
