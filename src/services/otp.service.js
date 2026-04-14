// ─── OTP Service ─────────────────────────────────────────
// OTP generation, storage, verification, and resend logic
// Updated: Verification now creates the actual User record

import prisma from "../prisma/client.js";
import { generateOtp, getOtpExpiry } from "../helpers/otp.helper.js";
import { hashPassword, comparePassword } from "../helpers/password.helper.js";
import { sendOtpEmail, sendWelcomeEmail } from "./email.service.js";

/**
 * Verify an OTP code and complete registration
 * @param {string} email - user's email
 * @param {string} code - 6-digit OTP
 * @returns {Promise<object>} created user
 */
export async function verifyOtp(email, code) {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Find the pending registration
  const pending = await prisma.pendingUser.findUnique({
    where: { email: normalizedEmail }
  });

  if (!pending) {
    throw Object.assign(new Error("No pending registration found for this email."), { statusCode: 404 });
  }

  // 2. Check expiry
  if (new Date() > pending.expiresAt) {
    await prisma.pendingUser.delete({ where: { id: pending.id } });
    throw Object.assign(new Error("OTP has expired. Please register again."), { statusCode: 400 });
  }

  // 3. Check attempts
  const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 5;
  if (pending.attempts >= maxAttempts) {
    await prisma.pendingUser.delete({ where: { id: pending.id } });
    throw Object.assign(new Error("Too many failed attempts. Please register again."), { statusCode: 429 });
  }

  // 4. Verify OTP code
  const isValid = await comparePassword(code, pending.otpCode);

  if (!isValid) {
    await prisma.pendingUser.update({
      where: { id: pending.id },
      data: { attempts: { increment: 1 } },
    });
    const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 5;
    const remaining = maxAttempts - pending.attempts - 1;
    throw Object.assign(new Error(`Invalid OTP. ${remaining} attempts remaining.`), { statusCode: 400 });
  }

  // 5. Success! Move data to User table
  const user = await prisma.user.create({
    data: {
      name: pending.name,
      email: pending.email,
      password: pending.password,
      phoneNumber: pending.phoneNumber,
      role: pending.role,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    }
  });

  // 6. Delete pending record
  await prisma.pendingUser.delete({ where: { id: pending.id } });

  // 7. Send welcome email
  sendWelcomeEmail(user.email, user.name).catch(() => {});

  return { message: "Email verified and account created successfully!", user };
}

/**
 * Resend OTP for a pending registration
 * @param {string} email
 */
export async function resendOtp(email) {
  const normalizedEmail = email.toLowerCase().trim();

  const pending = await prisma.pendingUser.findUnique({
    where: { email: normalizedEmail }
  });

  if (!pending) {
    throw Object.assign(new Error("No pending registration found."), { statusCode: 404 });
  }

  // Rate limiting (60s)
  if (new Date() - pending.createdAt < 60 * 1000) {
    throw Object.assign(new Error("Please wait 60 seconds before resending."), { statusCode: 429 });
  }

  const otpCode = generateOtp();
  const hashedOtp = await hashPassword(otpCode);

  await prisma.pendingUser.update({
    where: { id: pending.id },
    data: {
      otpCode: hashedOtp,
      expiresAt: getOtpExpiry(parseInt(process.env.OTP_EXPIRY_MINUTES) || 5),
      attempts: 0,
      createdAt: new Date(),
    }
  });

  await sendOtpEmail(normalizedEmail, otpCode, pending.name);
  return { message: "New OTP sent to your email." };
}
