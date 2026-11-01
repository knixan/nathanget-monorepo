import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";

// Prisma 7 pratar med PostgreSQL via en driver adapter (node-postgres). Poolens
// standardvärden skiljer sig från Prisma 6 – utan connectionTimeoutMillis väntar
// pg för evigt på en databas som inte svarar. Värdena matchar Prisma 6.
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 300_000,
});

// Återanvänd samma klient över hot-reloads i dev (tsx watch skapar annars en ny
// PrismaClient per omladdning → anslutningspoolen tar slut).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
