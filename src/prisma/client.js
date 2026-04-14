// ─── Prisma Client Singleton ─────────────────────────────
// Single Prisma instance with pg adapter for direct PostgreSQL connection

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg_prisma from "@prisma/client";
const { PrismaClient } = pkg_prisma;

// Create a pg Pool for the adapter
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create the Prisma adapter
const adapter = new PrismaPg(pool);

// Initialize PrismaClient with the pg adapter
const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
  await pool.end();
});

export default prisma;
