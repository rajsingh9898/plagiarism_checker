import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppSidebar } from "@/components/AppSidebar";

export default async function AppLayout({ children }: { children: ReactNode }) {
    const session = await getServerSession(authOptions);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            <AppSidebar 
                email={session?.user?.email || undefined} 
                role={session?.user?.role || undefined} 
            />
            {/* Main content */}
            <main className="flex-1 overflow-auto bg-slate-50 shadow-inner p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
