// ─── Worklynk Backend Server ─────────────────────────────
// Express 5 + Prisma + PostgreSQL with session-based auth

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import env from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { verifyEmailConnection } from "./services/email.service.js";
import { cleanExpiredSessions } from "./services/auth.service.js";

// ── Import Routes ────────────────────────────────────────
import authRouter from "./routes/auth.routes.js";
import adminRouter from "./routes/admin.routes.js";
import clientRouter from "./routes/client.routes.js";
import freelancerRouter from "./routes/freelancer.routes.js";

const app = express();

// ── Core Middleware ──────────────────────────────────────
app.use(cors({
  origin: env.clientUrl,
  credentials: true,
}));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

// ── Health Check ─────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 Worklynk API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ───────────────────────────────────────────
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/client", clientRouter);
app.use("/api/v1/freelancer", freelancerRouter);

// ── 404 Handler ──────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Error Handler (must be last) ─────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────
const PORT = env.port;

app.listen(PORT, async () => {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║   🚀 Worklynk API Server                 ║`);
  console.log(`║   Port: ${PORT}                             ║`);
  console.log(`║   Mode: ${env.nodeEnv.padEnd(30)}║`);
  console.log(`╚══════════════════════════════════════════╝\n`);

  // Verify email service connection
  await verifyEmailConnection();

  // Clean up expired sessions on startup
  await cleanExpiredSessions();

  // Schedule periodic session cleanup (every 30 minutes)
  setInterval(cleanExpiredSessions, 30 * 60 * 1000);
});

export default app;
