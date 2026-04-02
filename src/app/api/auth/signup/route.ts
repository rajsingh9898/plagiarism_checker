import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(6),
  otp: z.string().length(6),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, password, otp } = schema.parse(body);

    // 1. Verify the OTP
    const record = await prisma.emailOTP.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return NextResponse.json(
        { error: "No verification code found. Please request a new one." },
        { status: 400 }
      );
    }

    if (record.otp !== otp) {
      return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
    }

    if (new Date() > record.expiresAt) {
      await prisma.emailOTP.delete({ where: { id: record.id } });
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // 2. Check if user already exists
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Email already in use." }, { status: 400 });
    }

    // 3. Create the user
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: "USER",
      },
    });

    // 4. Clean up the used OTP
    await prisma.emailOTP.deleteMany({ where: { email } });

    return NextResponse.json(
      { message: "Account created successfully! Please sign in." },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: error.message || "Signup failed" }, { status: 400 });
  }
}
