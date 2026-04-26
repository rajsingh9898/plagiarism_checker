import { prisma } from "@/lib/prisma";
import { createTextFingerprint } from "@/lib/fingerprint";

export async function upsertSourceFingerprint(id: string, text: string) {
  const fingerprint = createTextFingerprint(text);
  await prisma.sourceDocument.update({
    where: { id },
    data: {
      fingerprint,
      indexVersion: { increment: 1 },
    },
  });
  return fingerprint;
}

export async function refreshAllSourceFingerprints() {
  const docs = await prisma.sourceDocument.findMany({
    select: { id: true, text: true },
  });

  let updated = 0;
  for (const doc of docs) {
    const fingerprint = createTextFingerprint(doc.text);
    await prisma.sourceDocument.update({
      where: { id: doc.id },
      data: { fingerprint },
    });
    updated++;
  }

  return { updated };
}
