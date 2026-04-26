import crypto from "crypto";

export function normalizeForFingerprint(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

export function createTextFingerprint(text: string): string {
  const normalized = normalizeForFingerprint(text);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export function createVerificationCode(scanId: string, createdAt: Date, secret = process.env.NEXTAUTH_SECRET || "verifyiq-default") {
  const payload = `${scanId}:${createdAt.toISOString()}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex").slice(0, 16).toUpperCase();
}

export function createShareToken() {
  return crypto.randomBytes(24).toString("hex");
}
