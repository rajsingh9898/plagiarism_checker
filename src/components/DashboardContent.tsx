"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Search, History, Settings, BarChart3, Calendar, Target, FileText, ArrowRight } from "lucide-react";

interface RecentScan {
    id: string;
    createdAt: Date;
    similarityScore: number;
    wordCount: number;
}

interface DashboardProps {
    email: string;
    role: string;
    stats: {
        totalScans: number;
        todayScans: number;
        avgSimilarity: number;
        totalWords: number;
    };
    recentScans: RecentScan[];
}

export function DashboardContent({ email, role, stats, recentScans }: DashboardProps) {
    const cards = [
        { label: "Total Scans", value: stats.totalScans, icon: BarChart3, badge: "All time", bgCircle: "bg-emerald-50", bgIcon: "bg-emerald-100", textIcon: "text-emerald-600", bgBadge: "bg-emerald-50", textBadge: "text-emerald-700", borderBadge: "border-emerald-100" },
        { label: "Today's Scans", value: `${stats.todayScans}/3`, icon: Calendar, badge: "Daily", bgCircle: "bg-blue-50", bgIcon: "bg-blue-100", textIcon: "text-blue-600", bgBadge: "bg-blue-50", textBadge: "text-blue-700", borderBadge: "border-blue-100" },
        { label: "Avg. Similarity", value: `${stats.avgSimilarity.toFixed(1)}%`, icon: Target, badge: "Recent", bgCircle: "bg-amber-50", bgIcon: "bg-amber-100", textIcon: "text-amber-600", bgBadge: "bg-amber-50", textBadge: "text-amber-700", borderBadge: "border-amber-100" },
        { label: "Words Analyzed", value: stats.totalWords.toLocaleString(), icon: FileText, badge: "Total", bgCircle: "bg-rose-50", bgIcon: "bg-rose-100", textIcon: "text-rose-600", bgBadge: "bg-rose-50", textBadge: "text-rose-700", borderBadge: "border-rose-100" },
    ];

    const actions = [
        { href: "/app/check", label: "New Scan", desc: "Check plagiarism & AI content", icon: Search, bgMain: "bg-emerald-50/50", borderMain: "border-emerald-100", hoverBg: "hover:bg-emerald-50", bgIcon: "bg-emerald-100", textIcon: "text-emerald-600", textHoverTitle: "group-hover:text-emerald-700" },
        { href: "/app/history", label: "View History", desc: "See all past scan reports", icon: History, bgMain: "bg-blue-50/50", borderMain: "border-blue-100", hoverBg: "hover:bg-blue-50", bgIcon: "bg-blue-100", textIcon: "text-blue-600", textHoverTitle: "group-hover:text-blue-700" },
    ];

    if (role === "ADMIN") {
        actions.push({ href: "/admin", label: "Admin Panel", desc: "Manage corpus & users", icon: Settings, bgMain: "bg-amber-50/50", borderMain: "border-amber-100", hoverBg: "hover:bg-amber-50", bgIcon: "bg-amber-100", textIcon: "text-amber-600", textHoverTitle: "group-hover:text-amber-700" });
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                        Welcome back, <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">{email.split("@")[0]}</span>
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Here's your writing integrity overview.</p>
                </div>
                <Link 
                    href="/app/check" 
                    className="inline-flex items-center justify-center px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                >
                    <Search className="w-4 h-4 mr-2" />
                    Scan Now
                </Link>
            </motion.div>

            {/* Stats Grid */}
            <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {cards.map((card, i) => (
                    <motion.div key={i} variants={itemVariants} 
                        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                    >
                        <div className={`absolute -right-4 -top-4 w-24 h-24 ${card.bgCircle} rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0`} />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-10 h-10 rounded-xl ${card.bgIcon} flex items-center justify-center ${card.textIcon}`}>
                                    <card.icon className="w-5 h-5" />
                                </div>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${card.bgBadge} ${card.textBadge} border ${card.borderBadge}`}>
                                    {card.badge}
                                </span>
                            </div>
                            <p className="text-3xl font-black text-slate-900 tracking-tight">{card.value}</p>
                            <p className="text-sm font-medium text-slate-500 mt-1">{card.label}</p>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {actions.map((action, i) => (
                    <motion.div key={i} variants={itemVariants}>
                        <Link href={action.href}
                            className={`group flex items-center gap-5 p-6 rounded-2xl ${action.bgMain} border ${action.borderMain} ${action.hoverBg} transition-colors h-full`}
                        >
                            <div className={`w-12 h-12 rounded-xl ${action.bgIcon} flex items-center justify-center ${action.textIcon} shadow-sm shrink-0`}>
                                <action.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className={`font-bold text-slate-800 ${action.textHoverTitle} transition-colors`}>{action.label}</p>
                                <p className="text-sm text-slate-500 mt-0.5">{action.desc}</p>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </motion.div>

            {/* Recent Scans */}
            <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-400" />
                        Recent Scans
                    </h2>
                    <Link href="/app/history" className="text-sm text-slate-500 hover:text-emerald-600 font-medium flex items-center gap-1 group">
                        View all <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
                {recentScans.length === 0 ? (
                    <div className="px-6 py-16 text-center text-slate-500 flex flex-col items-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-lg font-semibold text-slate-800">No scans yet</p>
                        <p className="text-sm mt-1">Start your first plagiarism & AI check now.</p>
                        <Link href="/app/check" className="mt-6 px-6 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-200">
                            Create First Scan
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {recentScans.map((scan) => (
                            <Link href={`/app/history/${scan.id}`} key={scan.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">{scan.wordCount.toLocaleString()} words</p>
                                        <p className="text-xs text-slate-500" suppressHydrationWarning>{new Date(scan.createdAt).toLocaleDateString()} at {new Date(scan.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold
                                            ${scan.similarityScore > 20 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}
                                        >
                                            {scan.similarityScore.toFixed(1)}% Match
                                        </span>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:block hidden" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
