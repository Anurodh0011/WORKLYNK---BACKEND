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
import profileRouter from "./routes/profile.routes.js";
import projectRouter from "./routes/project.routes.js";
import applicationRouter from "./routes/application.routes.js";
import bookmarkRouter from "./routes/bookmark.routes.js";
import contractRouter from "./routes/contract.routes.js";
import kanbanRouter from "./routes/kanban.routes.js";
import reviewRouter from "./routes/review.routes.js";

const app = express();

// ── Core Middleware ──────────────────────────────────────
app.use(cors({
  origin: env.clientUrl,
  credentials: true,
}));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

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
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/client", clientRouter);
app.use("/api/freelancer", freelancerRouter);
app.use("/api/profile", profileRouter);
app.use("/api/projects", projectRouter);
app.use("/api/applications", applicationRouter);
app.use("/api/bookmarks", bookmarkRouter);
app.use("/api/contracts", contractRouter);
app.use("/api/kanban", kanbanRouter);
app.use("/api/reviews", reviewRouter);

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
