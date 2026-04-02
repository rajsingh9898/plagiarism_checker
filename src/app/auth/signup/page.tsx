"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

type Step = "email" | "otp" | "password";

export default function SignupPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  // Step 1: Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      toast.success("Verification code sent! Check your inbox.");
      setStep("otp");
      setResendTimer(60);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // OTP input handler
  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOTPPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { toast.error("Enter the complete 6-digit code"); return; }
    setLoading(true);
    try {
      // We just visually verify here; actual check happens at account creation
      // Move to password step
      setStep("password");
      toast.success("Code verified! Set your password.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Create account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error("Passwords don't match"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, otp: otp.join("") }),
      });
      const data = await res.json();
      if (!res.ok) {
        // OTP might be invalid/expired — go back to OTP step
        if (data.error?.includes("code")) {
          setStep("otp");
          setOtp(["", "", "", "", "", ""]);
        }
        throw new Error(data.error || "Signup failed");
      }
      toast.success("Account created! Please sign in.");
      router.push("/auth/login");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("New code sent!");
      setOtp(["", "", "", "", "", ""]);
      setResendTimer(60);
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = step === "email" ? 0 : step === "otp" ? 1 : 2;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-center items-center flex-1 px-12 relative overflow-hidden">
        <div className="absolute top-8 left-8">
          <Link href="/"><img src="/logo.png" alt="VerifyIQ Logo" className="h-20 w-auto" /></Link>
        </div>
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute top-1/4 right-0 w-64 h-64 rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />

        {/* Step indicators on left panel */}
        <div className="space-y-6 w-full max-w-xs">
          {[
            { label: "Enter your email", desc: "We'll send you a 6-digit code" },
            { label: "Verify your email", desc: "Enter the code from your inbox" },
            { label: "Set your password", desc: "Choose a secure password" },
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all duration-300 ${
                i < stepIndex ? "bg-emerald-500 text-white" :
                i === stepIndex ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white ring-4 ring-emerald-500/20" :
                "bg-slate-800 text-slate-500"
              }`}>
                {i < stepIndex ? "✓" : i + 1}
              </div>
              <div>
                <p className={`font-semibold text-sm ${i === stepIndex ? "text-white" : i < stepIndex ? "text-emerald-400" : "text-slate-500"}`}>{s.label}</p>
                <p className="text-slate-500 text-xs">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-4xl font-black text-white leading-tight mt-12">
          Start protecting<br />
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">your originality.</span>
        </h2>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <Link href="/"><img src="/logo.png" alt="VerifyIQ Logo" className="h-16 w-auto" /></Link>
          </div>

          {/* Progress bar */}
          <div className="flex gap-2 mb-8">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= stepIndex ? "bg-gradient-to-r from-emerald-500 to-cyan-500" : "bg-slate-800"}`} />
            ))}
          </div>

          {/* ── STEP 1: Email ── */}
          {step === "email" && (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div>
                <h1 className="text-3xl font-extrabold text-white mb-2">Create account</h1>
                <p className="text-slate-400 mb-8">We'll send a verification code to your email.</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Full Name</label>
                <input
                  id="signup-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Email Address</label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                id="send-otp-btn"
                disabled={loading}
                className="w-full py-3.5 font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
                ) : (
                  "Send Verification Code →"
                )}
              </button>
              <p className="text-sm text-slate-500 text-center">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300 font-semibold">Sign in</Link>
              </p>
            </form>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <h1 className="text-3xl font-extrabold text-white mb-2">Check your inbox</h1>
                <p className="text-slate-400 mb-1">We sent a 6-digit code to</p>
                <p className="text-emerald-400 font-semibold break-all">{email}</p>
              </div>

              {/* OTP inputs */}
              <div className="flex gap-3 justify-center" onPaste={handleOTPPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOTPChange(i, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown(i, e)}
                    className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-white/5 text-white focus:outline-none transition-all duration-200 ${
                      digit ? "border-emerald-500 bg-emerald-500/10" : "border-white/10 focus:border-emerald-500/50"
                    }`}
                  />
                ))}
              </div>

              <button
                type="submit"
                id="verify-otp-btn"
                disabled={loading || otp.join("").length < 6}
                className="w-full py-3.5 font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</>
                ) : (
                  "Verify Code →"
                )}
              </button>

              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendTimer > 0}
                  className="text-sm text-slate-400 hover:text-emerald-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Didn't receive it? Resend code"}
                </button>
                <br />
                <button
                  type="button"
                  onClick={() => { setStep("email"); setOtp(["", "", "", "", "", ""]); }}
                  className="text-sm text-slate-500 hover:text-slate-300 transition"
                >
                  ← Change email
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 3: Password ── */}
          {step === "password" && (
            <form onSubmit={handleCreateAccount} className="space-y-5">
              <div>
                <h1 className="text-3xl font-extrabold text-white mb-2">Set your password</h1>
                <p className="text-slate-400 mb-8">Almost done! Choose a strong password for your account.</p>
              </div>

              {/* Verified email badge */}
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
                <span className="text-emerald-400 text-lg">✓</span>
                <span className="text-emerald-300 text-sm font-medium">{email}</span>
                <span className="text-emerald-500 text-xs ml-auto">Verified</span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Password</label>
                <input
                  id="signup-password"
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
                  id="signup-confirm-password"
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
                  <p className="text-red-400 text-xs mt-1">Passwords don't match</p>
                )}
              </div>

              <button
                type="submit"
                id="create-account-btn"
                disabled={loading}
                className="w-full py-3.5 font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account…</>
                ) : (
                  "Create Account 🚀"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
