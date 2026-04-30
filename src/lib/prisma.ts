import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

let prismaInstance: PrismaClient | null = null;
let initError: Error | null = null;

try {
    prismaInstance = globalForPrisma.prisma || new PrismaClient({ log: ["query"] });
    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prismaInstance;
} catch (err: any) {
    initError = err instanceof Error ? err : new Error(String(err));
    // Log a clear error to help diagnosing deployment issues (missing env, generate step, etc.)
    // Avoid throwing during module import so we can surface a clearer message later in logs.
    // eslint-disable-next-line no-console
    console.error("Prisma initialization failed:", initError.message);
}

// Export a proxy that rethrows the original init error when any property is accessed.
export const prisma: PrismaClient = (new Proxy(
    {},
    {
        get(_target, prop) {
            if (prismaInstance) return (prismaInstance as any)[prop];
            const message = initError
                ? `Prisma Client not initialized: ${initError.message}`
                : 'Prisma Client not initialized: unknown error. Ensure DATABASE_URL and NEXTAUTH_SECRET are set and that `prisma generate` ran during build.';
            throw new Error(message);
        },
        apply(_target, _thisArg, _args) {
            if (prismaInstance) return (prismaInstance as any).apply(_thisArg, _args);
            throw new Error('Prisma Client not initialized.');
        },
    }
) as any) as PrismaClient;
