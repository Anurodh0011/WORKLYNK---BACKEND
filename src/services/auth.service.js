// ─── Auth Service ────────────────────────────────────────
// Core authentication business logic: register, login, logout, sessions
// Updated: Register only saves to PendingUser until verified

import crypto from "crypto";
import prisma from "../prisma/client.js";
import env from "../config/env.js";
import { hashPassword, comparePassword } from "../helpers/password.helper.js";
import { generateOtp, getOtpExpiry } from "../helpers/otp.helper.js";
import {
  sendOtpEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
} from "./email.service.js";

/**
 * Stage a new user for registration (saves to PendingUser)
 * @param {{ name: string, email: string, password: string, role?: string, phoneNumber?: string }} data
 * @returns {Promise<object>} pending user data (without password/otp)
 */
export async function registerUser({
  name,
  email,
  password,
  role = "CLIENT",
  phoneNumber,
}) {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check if user already exists in main table
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existingUser) {
    throw Object.assign(
      new Error("An account with this email already exists"),
      { statusCode: 409 },
    );
  }

  // 2. Validate role
  const validRoles = ["ADMIN", "CLIENT", "FREELANCER"];
  const normalizedRole = role.toUpperCase();
  if (!validRoles.includes(normalizedRole)) {
    throw Object.assign(new Error("Invalid role specified"), {
      statusCode: 400,
    });
  }
  if (normalizedRole === "ADMIN") {
    throw Object.assign(
      new Error("Admin accounts cannot be created through registration"),
      { statusCode: 403 },
    );
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
      phoneNumber,
      otpCode: hashedOtp,
      expiresAt: getOtpExpiry(env.otpExpiryMinutes),
      attempts: 0,
    },
    create: {
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      phoneNumber,
      otpCode: hashedOtp,
      expiresAt: getOtpExpiry(env.otpExpiryMinutes),
    },
  });

  // 5. Send OTP email (don't wait for it to return to speed up response)
  sendOtpEmail(normalizedEmail, otpCode, name).catch((err) =>
    console.error("Email send error:", err),
  );

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
    include: { profile: true },
  });

  if (!user) {
    // Check if user is in pending
    const pending = await prisma.pendingUser.findUnique({
      where: { email: normalizedEmail },
    });
    if (pending) {
      throw Object.assign(
        new Error("Please verify your email before logging in."),
        { statusCode: 403 },
      );
    }
    throw Object.assign(new Error("Invalid email or password"), {
      statusCode: 401,
    });
  }

  // Check account status
  if (user.status === "SUSPENDED") {
    throw Object.assign(
      new Error("Your account has been suspended. Contact support."),
      { statusCode: 403 },
    );
  }

  if (user.status === "DEACTIVATED") {
    throw Object.assign(new Error("This account has been deactivated"), {
      statusCode: 403,
    });
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw Object.assign(new Error("Invalid email or password"), {
      statusCode: 401,
    });
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
      phoneNumber: user.phoneNumber,
      profile: user.profile ? {
        verificationStatus: user.profile.verificationStatus
      } : null
    },
    sessionToken,
    expiresAt: session.expiresAt,
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
          phoneNumber: true,
          profile: {
            select: {
              verificationStatus: true
            }
          }
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
      phoneNumber: true,
      lastLoginAt: true,
      profile: {
        select: {
          verificationStatus: true
        }
      }
    },
  });
}

export async function cleanExpiredSessions() {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}

/**
 * Initiate password reset process
 * @param {string} email
 */
export async function forgotPassword(email) {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check if user exists
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (!user) {
    // For security, don't reveal if user exists. Just say "If an account exists..."
    return {
      message:
        "If an account exists with this email, a reset code has been sent.",
    };
  }

  // 2. Generate reset code (6 digits)
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedCode = await hashPassword(resetCode);

  // 3. Cleanup old unverified requests and Save new one
  await prisma.$transaction([
    prisma.passwordReset.deleteMany({
      where: { email: normalizedEmail, verified: false },
    }),
    prisma.passwordReset.create({
      data: {
        email: normalizedEmail,
        code: hashedCode,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    }),
  ]);

  // 4. Send email
  sendPasswordResetEmail(normalizedEmail, resetCode, user.name).catch((err) =>
    console.error("Email send error:", err),
  );

  return {
    message:
      "If an account exists with this email, a reset code has been sent.",
  };
}

/**
 * Verify the reset code sent to email
 */
export async function verifyResetCode(email, code) {
  const normalizedEmail = email.toLowerCase().trim();

  const resetRequest = await prisma.passwordReset.findFirst({
    where: {
      email: normalizedEmail,
      expiresAt: { gt: new Date() },
      verified: false,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!resetRequest) {
    throw Object.assign(new Error("Invalid or expired reset code"), {
      statusCode: 400,
    });
  }

  const isValid = await comparePassword(code, resetRequest.code);
  if (!isValid) {
    throw Object.assign(new Error("Invalid or expired reset code"), {
      statusCode: 400,
    });
  }

  // Mark as verified
  await prisma.passwordReset.update({
    where: { id: resetRequest.id },
    data: { verified: true },
  });

  return { email: normalizedEmail, message: "Code verified successfully" };
}

/**
 * Reset password using verified code
 */
export async function resetPassword(email, newPassword) {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check if the code was verified recently (within last 15 mins)
  const verifiedRequest = await prisma.passwordReset.findFirst({
    where: {
      email: normalizedEmail,
      verified: true,
      createdAt: { gt: new Date(Date.now() - 30 * 60 * 1000) }, // 30 mins window total
    },
    orderBy: { createdAt: "desc" },
  });

  if (!verifiedRequest) {
    throw Object.assign(new Error("Reset session expired or not found"), {
      statusCode: 403,
    });
  }

  // 2. Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // 3. Update user password
  await prisma.user.update({
    where: { email: normalizedEmail },
    data: { password: hashedPassword },
  });

  // 4. Cleanup: invalidate reset sessions for this email
  await prisma.passwordReset.deleteMany({ where: { email: normalizedEmail } });

  return { message: "Password reset successful" };
}
