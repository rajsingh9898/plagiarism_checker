import { ReactNode } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const session = await getServerSession(authOptions);
    if (session?.user.role !== "ADMIN") {
        redirect("/app");
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center">
                        <span className="text-xl font-bold text-gray-900">Admin Dashboard</span>
                    </div>
                    <nav className="flex space-x-4 items-center">
                        <Link href="/app" className="text-gray-500 hover:text-gray-900">Back to App</Link>
                        <div className="w-24">
                            <LogoutButton />
                        </div>
                    </nav>
                </div>
            </header>
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                {children}
            </main>
        </div>
    );
}
