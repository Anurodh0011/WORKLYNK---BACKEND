// ─── Centralized Environment Configuration ──────────────
// All env variables accessed through this module

import dotenv from "dotenv";
dotenv.config();

const env = {
  // Server
  port: parseInt(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: (process.env.NODE_ENV || "development") === "development",

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // Session
  sessionSecret: process.env.SESSION_SECRET || "worklynk-session-secret-change-me",
  sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE) || 7 * 24 * 60 * 60 * 1000, // 7 days

  // Email (SMTP with Gmail App Password)
  email: {
    address: process.env.EMAIL_ADDRESS || "",
    appPassword: process.env.EMAIL_APP_PASSWORD || "",
    from: process.env.EMAIL_FROM || "Worklynk <noreply@worklynk.com>",
  },

  // OTP
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 5,
  otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS) || 5,

  // Backend URL (Self-reference if needed for emails/OAuth)
  backendUrl: process.env.BACKEND_URL || "http://localhost:5001",

  // Client URL (for CORS)
  clientUrl: process.env.CLIENT_URL || "http://localhost:3001",
};

export default env;
