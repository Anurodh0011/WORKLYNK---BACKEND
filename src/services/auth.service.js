// ─── Auth Service ────────────────────────────────────────
// Core authentication business logic: register, login, logout, sessions
// Updated: Register only saves to PendingUser until verified

import crypto from "crypto";
import prisma from "../prisma/client.js";
import env from "../config/env.js";
import { hashPassword, comparePassword } from "../helpers/password.helper.js";
import { generateOtp, getOtpExpiry } from "../helpers/otp.helper.js";
import { sendOtpEmail } from "./email.service.js";

/**
 * Stage a new user for registration (saves to PendingUser)
 * @param {{ name: string, email: string, password: string, role?: string }} data
 * @returns {Promise<object>} pending user data (without password/otp)
 */
export async function registerUser({ name, email, password, role = "CLIENT" }) {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check if user already exists in main table
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw Object.assign(new Error("An account with this email already exists"), { statusCode: 409 });
  }

  // 2. Validate role
  const validRoles = ["ADMIN", "CLIENT", "FREELANCER"];
  const normalizedRole = role.toUpperCase();
  if (!validRoles.includes(normalizedRole)) {
    throw Object.assign(new Error("Invalid role specified"), { statusCode: 400 });
  }
  if (normalizedRole === "ADMIN") {
    throw Object.assign(new Error("Admin accounts cannot be created through registration"), { statusCode: 403 });
  }

  // 3. Hash password and generate OTP
  const hashedPassword = await hashPassword(password);
  const otpCode = generateOtp();
  const hashedOtp = await hashPassword(otpCode);

  // 4. Save to PendingUser (upsert if exists)
  const pendingUser = await prisma.pendingUser.upsert({
    where: { email: normalizedEmail },
    update: {
      name,
      password: hashedPassword,
      role: normalizedRole,
      otpCode: hashedOtp,
      expiresAt: getOtpExpiry(env.otpExpiryMinutes),
      attempts: 0,
    },
    create: {
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      otpCode: hashedOtp,
      expiresAt: getOtpExpiry(env.otpExpiryMinutes),
    },
  });

  // 5. Send OTP email (don't wait for it to return to speed up response)
  sendOtpEmail(normalizedEmail, otpCode, name).catch(err => console.error("Email send error:", err));

  return {
    email: pendingUser.email,
    name: pendingUser.name,
    role: pendingUser.role,
    message: "OTP sent. User will be created after verification.",
  };
}

/**
 * Authenticate a user by email and password, then create a session
 */
export async function loginUser({ email, password, ipAddress, userAgent }) {
  const normalizedEmail = email.toLowerCase().trim();

  // Find user in main table only
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    // Check if user is in pending
    const pending = await prisma.pendingUser.findUnique({ where: { email: normalizedEmail } });
    if (pending) {
      throw Object.assign(new Error("Please verify your email before logging in."), { statusCode: 403 });
    }
    throw Object.assign(new Error("Invalid email or password"), { statusCode: 401 });
  }

  // Check account status
  if (user.status === "SUSPENDED") {
    throw Object.assign(new Error("Your account has been suspended. Contact support."), { statusCode: 403 });
  }

  if (user.status === "DEACTIVATED") {
    throw Object.assign(new Error("This account has been deactivated"), { statusCode: 403 });
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw Object.assign(new Error("Invalid email or password"), { statusCode: 401 });
  }

  // Session logic...
  const sessionToken = crypto.randomBytes(48).toString("hex");
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      expiresAt: new Date(Date.now() + env.sessionMaxAge),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
    sessionToken,
    expiresAt: session.expiresAt
  };
}

/**
 * Destroy a session (logout)
 */
export async function logoutUser(sessionToken) {
  if (!sessionToken) return;
  await prisma.session.deleteMany({ where: { token: sessionToken } });
}

/**
 * Validate a session token
 */
export async function validateSession(sessionToken) {
  if (!sessionToken) return null;
  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
        },
      },
    },
  });

  if (!session || new Date() > session.expiresAt) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  return session.user;
}

export async function getUserById(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      lastLoginAt: true,
    },
  });
}

export async function cleanExpiredSessions() {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
