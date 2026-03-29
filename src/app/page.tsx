import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LandingHero from "@/components/LandingHero";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/app");

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* -- NAV -- */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-slate-950/50 border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-20">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight">VerifyIQ</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/auth/login" className="text-sm font-medium text-slate-300 hover:text-white transition">
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="text-sm font-semibold px-6 py-2.5 rounded-full bg-white text-slate-950 hover:bg-slate-200 transition shadow-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Content Client Component */}
      <LandingHero />
    </div>
  );
}
