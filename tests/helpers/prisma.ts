import { PrismaClient } from "@prisma/client";

declare global {
  var __testPrisma: PrismaClient | undefined;
}

export const testPrisma = global.__testPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__testPrisma = testPrisma;
}
