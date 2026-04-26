import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { processNextQueuedJob } from "@/lib/scan-worker";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await processNextQueuedJob();
  return NextResponse.json(result);
}
