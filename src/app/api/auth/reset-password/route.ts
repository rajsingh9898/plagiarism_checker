import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, password } = schema.parse(body);

    // Find the token
    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      );
    }

    if (new Date() > record.expiresAt) {
      await prisma.passwordResetToken.delete({ where: { id: record.id } });
      return NextResponse.json(
        { error: "Reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash the new password and update the user
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { email: record.email },
      data: { password: hashedPassword },
    });

    // Clean up used token
    await prisma.passwordResetToken.deleteMany({ where: { email: record.email } });

    return NextResponse.json(
      { message: "Password reset successfully! You can now sign in." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
