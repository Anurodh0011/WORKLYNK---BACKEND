// ─── OTP Helper ──────────────────────────────────────────
// Secure random OTP generation

import crypto from "crypto";

/**
 * Generate a cryptographically secure 6-digit OTP
 * @returns {string} 6-digit OTP string
 */
export function generateOtp() {
  // Generate a random number between 100000 and 999999
  const otp = crypto.randomInt(100000, 999999);
  return otp.toString(); 
}

/**
 * Calculate OTP expiration timestamp
 * @param {number} minutes - minutes until expiry
 * @returns {Date}
 */
export function getOtpExpiry(minutes = 5) {
  return new Date(Date.now() + minutes * 60 * 1000);
}
