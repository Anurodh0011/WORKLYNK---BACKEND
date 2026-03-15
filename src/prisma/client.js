// ─── Prisma Client Singleton ─────────────────────────────
// Single Prisma instance with pg adapter for direct PostgreSQL connection

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import env from "../config/env.js";
import { PrismaClient } from "@prisma/client";

// Create a pg Pool for the adapter
const pool = new pg.Pool({
  connectionString: env.databaseUrl,
});

// Create the Prisma adapter
const adapter = new PrismaPg(pool);

// Initialize PrismaClient with the pg adapter
const prisma = new PrismaClient({
  adapter,
  log: env.isDev ? ["warn", "error"] : ["error"],
});

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
  await pool.end();
});

export default prisma;
