"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Search, PenTool, TrendingUp, Fingerprint, History, Layers, ShieldCheck, Settings, Menu, X, LogOut, Users } from "lucide-react";

export function AppSidebar({ email, role }: { email?: string; role?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const handleLogout = async () => {
        setIsOpen(false);
        await signOut({ redirect: false });
        window.location.href = "/auth/login";
    };

    const navItems = [
        { href: "/app", label: "Dashboard", icon: LayoutDashboard },
        { href: "/app/check", label: "New Scan", icon: Search },
        { href: "/app/live", label: "Live Editor", icon: PenTool },
        { href: "/app/coach", label: "Coach", icon: TrendingUp },
        { href: "/app/fingerprint", label: "Fingerprint", icon: Fingerprint },
        { href: "/app/history", label: "History", icon: History },
        { href: "/app/batch", label: "Batch Tools", icon: Layers },
        { href: "/app/teams", label: "Teams", icon: Users },
        { href: "/app/policies", label: "Policies", icon: ShieldCheck },
        { href: "/app/settings", label: "Settings", icon: Settings },
    ];

    return (
        <>
            {/* Mobile Header Menu */}
            <div className="md:hidden flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
                <Link href="/app" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center">
                        <span className="text-white font-bold text-xs">VIQ</span>
                    </div>
                </Link>
                <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-300">
                    {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`
                fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800 flex flex-col
                transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="h-16 hidden md:flex items-center px-6 border-b border-slate-800 bg-slate-950">
                    <Link href="/app" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                             <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                             </svg>
                        </div>
                        <span className="text-lg font-bold text-white tracking-tight">VerifyIQ</span>
                    </Link>
                </div>
                
                <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link 
                                key={item.href} 
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                                    ${isActive 
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                                {item.label}
                            </Link>
                        );
                    })}

                    {role === "ADMIN" && (
                        <>
                            <div className="pt-4 pb-2 px-3">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin</p>
                            </div>
                            <Link href="/admin" onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition border border-amber-200/50">
                                <Settings className="w-5 h-5 text-amber-600" />
                                Admin Panel
                            </Link>
                        </>
                    )}
                </nav>

                <div className="p-4 border-t border-slate-800 flex flex-col gap-3">
                    <p className="text-xs text-slate-400 font-medium truncate px-2" title={email}>
                        {email}
                    </p>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition border border-transparent hover:border-rose-500/20 text-left"
                    >
                        <LogOut className="w-5 h-5 text-rose-400" />
                        Log out
                    </button>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
