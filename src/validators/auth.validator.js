// ─── Auth Validators ─────────────────────────────────────
// express-validator chains for registration and login

import { body } from "express-validator";

/**
 * Validation rules for user registration
 */
export const registerRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("phoneNumber")
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/\d/)
    .withMessage("Password must contain at least one number"),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirm password is required")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),

  body("role")
    .optional()
    .trim()
    .toUpperCase()
    .isIn(["CLIENT", "FREELANCER"])
    .withMessage("Role must be either CLIENT or FREELANCER"),
];

/**
 * Validation rules for user login
 */
export const loginRules = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("phoneNumber")
    .optional({ checkFalsy: true })
    .trim()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),

  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

/**
 * Validation rules for forgot password
 */
export const forgotPasswordRules = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("phoneNumber")
    .optional({ checkFalsy: true })
    .trim()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
];

/**
 * Validation rules for verify code
 */
export const verifyCodeRules = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("phoneNumber")
    .optional({ checkFalsy: true })
    .trim()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Verification code is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("Verification code must be 6 digits"),
];

/**
 * Validation rules for reset password
 */
export const resetPasswordRules = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("phoneNumber")
    .optional({ checkFalsy: true })
    .trim()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
  body("password")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/\d/)
    .withMessage("Password must contain at least one number"),
];
