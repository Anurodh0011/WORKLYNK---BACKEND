// ─── Email Service ───────────────────────────────────────
// Nodemailer SMTP transport using Gmail App Password

import nodemailer from "nodemailer";
import env from "../config/env.js";

// Create reusable transporter (force IPv4 for cloud hosting compatibility)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  family: 4, // Force IPv4 — Render free tier doesn't support IPv6
  auth: {
    user: env.email.address,
    pass: env.email.appPassword,
  },
});

/**
 * Verify SMTP connection on startup
 */
export async function verifyEmailConnection() {
  try {
    if (!env.email.address || !env.email.appPassword) {
      console.warn(
        "Email credentials not configured — OTP emails will not be sent",
      );
      return false;
    }
    await transporter.verify();
    console.log("Email service connected successfully");
    return true;
  } catch (error) {
    console.warn("Email service connection failed:", error.message);
    return false;
  }
}

/**
 * Send OTP verification email
 * @param {string} to - recipient email
 * @param {string} otpCode - the 6-digit OTP
 * @param {string} userName - user's name for personalization
 */
export async function sendOtpEmail(to, otpCode, userName = "User") {
  const mailOptions = {
    from: env.email.from || `Worklynk <${env.email.address}>`,
    to,
    subject: "Worklynk — Email Verification OTP",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #1e293b; margin-bottom: 8px;">Verify Your Email</h2>
        <p style="color: #475569; font-size: 15px;">
          Hi <strong>${userName}</strong>, welcome to Worklynk! Use the code below to verify your email address.
        </p>
        <div style="background: #0f172a; color: #38bdf8; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; border-radius: 8px; margin: 24px 0;">
          ${otpCode}
        </div>
        <p style="color: #64748b; font-size: 13px;">
          This code expires in <strong>${env.otpExpiryMinutes} minutes</strong>. Do not share it with anyone.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          If you didn't create a Worklynk account, please ignore this email.
        </p>
      </div>
    `,
  };

  try {
    // Only logged in development/test environments
    if (env.nodeEnv === "development") {
      console.log(`\n📧 [DEVELOPMENT] OTP for ${to}: ${otpCode}\n`);
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 OTP email sent to ${to} — MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Failed to send OTP email:", error.message);

    // If in dev, we allow it to proceed so developers can test the verification flow via console logs
    if (env.nodeEnv === "development") {
      console.warn(
        "Email delivery failed, but proceeding in dev mode since OTP was logged above.",
      );
      return { success: true, messageId: "dev-mock-id" };
    }

    throw new Error(
      "Failed to send verification email. Please try again later.",
    );
  }
}

/**
 * Send welcome email after successful verification
 * @param {string} to - recipient email
 * @param {string} userName - user's name
 */
export async function sendWelcomeEmail(to, userName = "User") {
  const mailOptions = {
    from: env.email.from || `Worklynk <${env.email.address}>`,
    to,
    subject: "Welcome to Worklynk! 🎉",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #1e293b;">Welcome aboard, ${userName}! </h2>
        <p style="color: #475569; font-size: 15px;">
          Your email has been verified. You're all set to start using Worklynk — 
          connecting Nepali clients with talented freelancers.
        </p>
        <p style="color: #475569; font-size: 15px;">
          Start exploring projects, building your profile, and growing your network today.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          — The Worklynk Team
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Welcome email sent to ${to}`);
  } catch (error) {
    // Welcome email failure is non-critical
    console.warn("Failed to send welcome email:", error.message);
  }
}
/**
 * Send Password Reset OTP email
 * @param {string} to - recipient email
 * @param {string} otpCode - the 6-digit OTP
 * @param {string} userName - user's name
 */
export async function sendPasswordResetEmail(to, otpCode, userName = "User") {
  const mailOptions = {
    from: env.email.from || `Worklynk <${env.email.address}>`,
    to,
    subject: "Worklynk — Password Reset OTP",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #fff7ed; border-radius: 12px; border: 1px solid #ffedd5;">
        <h2 style="color: #9a3412; margin-bottom: 8px;">Reset Your Password</h2>
        <p style="color: #475569; font-size: 15px;">
          Hi <strong>${userName}</strong>, we received a request to reset your password. Use the code below to proceed.
        </p>
        <div style="background: #9a3412; color: #fff; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; border-radius: 8px; margin: 24px 0;">
          ${otpCode}
        </div>
        <p style="color: #64748b; font-size: 13px;">
          This code expires in <strong>15 minutes</strong>. If you didn't request this, please secure your account.
        </p>
        <hr style="border: none; border-top: 1px solid #fed7aa; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          — The Worklynk Security Team
        </p>
      </div>
    `,
  };

  try {
    if (env.nodeEnv === "development") {
      console.log(`\n📧 [DEVELOPMENT] Reset Code for ${to}: ${otpCode}\n`);
    }
    await transporter.sendMail(mailOptions);
    console.log(`📧 Reset email sent to ${to}`);
  } catch (error) {
    console.error("Failed to send reset email:", error.message);
    if (env.nodeEnv === "development") {
      return { success: true };
    }
    throw new Error("Failed to send reset email.");
  }
}
