import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardContent } from "@/components/DashboardContent";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const totalScans = await prisma.scan.count({ where: { userId: session.user.id } });

  const recentScans = await prisma.scan.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { matches: true },
  });

  const avgSimilarity = recentScans.length
    ? recentScans.reduce((acc, s) => acc + s.similarityScore, 0) / recentScans.length
    : 0;

  const totalWords = recentScans.reduce((acc, s) => acc + s.wordCount, 0);

  // Today's scans
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayScans = await prisma.scan.count({
    where: { userId: session.user.id, createdAt: { gte: today } },
  });

  const stats = {
      totalScans,
      todayScans,
      avgSimilarity,
      totalWords
  };

  return (
      <DashboardContent 
          email={session.user.email!}
          role={session.user.role!}
          stats={stats}
          recentScans={recentScans}
      />
  );
}
