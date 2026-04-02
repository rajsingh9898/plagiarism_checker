import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOTPEmail } from "@/lib/mailer";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
});

// Generate a secure 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    // Delete any previous OTPs for this email
    await prisma.emailOTP.deleteMany({ where: { email } });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.emailOTP.create({
      data: { email, otp, expiresAt },
    });

    await sendOTPEmail(email, otp);

    return NextResponse.json({ message: "Verification code sent to your email!" }, { status: 200 });
  } catch (error: any) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ error: error.message || "Failed to send code" }, { status: 500 });
  }
}
