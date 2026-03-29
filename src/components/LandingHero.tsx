"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, Lock, Zap, CheckCircle2, ChevronRight, FileSearch, Fingerprint } from "lucide-react";

export default function LandingHero() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden selection:bg-emerald-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[120px] mix-blend-screen animate-pulse duration-10000" />
        <div className="absolute top-[40%] right-[10%] w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[120px] mix-blend-screen animate-pulse duration-7000" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-40 pb-32 px-6 max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8 backdrop-blur-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          VerifyIQ 2.0 is Here
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-6xl md:text-8xl font-black tracking-tight mb-8 leading-tight"
        >
          Protect Your <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 animate-gradient-x">
            Digital Identity
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-xl md:text-2xl text-slate-400 max-w-3xl mb-12 leading-relaxed"
        >
          The ultimate platform for plagiarism detection, AI content verification, and authorship fingerprinting. Secure, intelligent, and blazing fast.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
        >
          <Link
            href="/auth/signup"
            className="group relative flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-950 rounded-full font-bold text-lg hover:scale-105 transition-all duration-300 shadow-xl shadow-white/10"
          >
            Start For Free
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/auth/login"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white rounded-full font-semibold text-lg hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-sm"
          >
            Sign In
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-16 flex flex-wrap justify-center gap-x-12 gap-y-6 text-sm text-slate-500 font-medium"
        >
          {[
            { icon: Shield, text: "Bank-grade Security" },
            { icon: Lock, text: "Zero Data Stored" },
            { icon: Zap, text: "Instant Results" }
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-2">
              <feature.icon className="w-5 h-5 text-emerald-500" />
              {feature.text}
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 py-32 px-6 bg-slate-900/50 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Unrivaled Analysis</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">Everything you need to ensure authenticity and originality in one powerful suite.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: FileSearch,
                title: "Deep Plagiarism",
                desc: "Advanced 5-word shingle analysis with precise Jaccard similarity scoring. Catches even the cleverest rewrites.",
                classes: "from-emerald-500/5 bg-emerald-500/10 text-emerald-400"
              },
              {
                icon: CheckCircle2,
                title: "AI Detection",
                desc: "Proprietary pattern recognition analyzing burstiness and perplexity to spot AI-generated content instantly.",
                classes: "from-cyan-500/5 bg-cyan-500/10 text-cyan-400"
              },
              {
                icon: Fingerprint,
                title: "Author Fingerprinting",
                desc: "Build unique stylistic profiles for writers and automatically verify new documents against their historical style.",
                classes: "from-blue-500/5 bg-blue-500/10 text-blue-400"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="group relative p-8 rounded-3xl bg-slate-950 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className={`absolute inset-0 bg-gradient-to-br to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl ${feature.classes.split(" ")[0]}`} />
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${feature.classes.split(" ")[1]}`}>
                  <feature.icon className={`w-7 h-7 ${feature.classes.split(" ")[2]}`} />
                </div>
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
