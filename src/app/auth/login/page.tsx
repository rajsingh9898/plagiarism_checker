"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      toast.error("Invalid email or password");
    } else {
      toast.success("Welcome back!");
      router.push("/app");
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-center items-center flex-1 px-12 relative">
        <div className="absolute top-8 left-8">
          <Link href="/">
            <img src="/logo.png" alt="VerifyIQ Logo" className="h-20 w-auto" />
          </Link>
        </div>
        <div className="absolute -top-20 right-0 w-96 h-96 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />
        <h2 className="text-4xl font-black text-white leading-tight mb-4">
          Your words.<br />
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Verified.</span>
        </h2>
        <p className="text-slate-400 text-lg max-w-sm">
          Plagiarism checker, AI detector, rewrite assistant — all in one platform.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link href="/">
                <img src="/logo.png" alt="VerifyIQ Logo" className="h-16 w-auto" />
              </Link>
            </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Sign in</h1>
          <p className="text-slate-400 mb-8">Enter your credentials to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50">
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-sm text-slate-500 mt-6 text-center">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-emerald-400 hover:text-emerald-300 font-semibold">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
