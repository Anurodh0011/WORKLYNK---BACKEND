import { body, param, query } from "express-validator";

export const createProjectRules = [
  body("title")
    .if(body("status").equals("OPEN"))
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 5, max: 200 })
    .withMessage("Title must be between 5 and 200 characters"),

  body("description")
    .if(body("status").equals("OPEN"))
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 20 })
    .withMessage("Description must be at least 20 characters long"),

  body("category")
    .if(body("status").equals("OPEN"))
    .trim()
    .notEmpty()
    .withMessage("Category is required"),

  body("budgetType")
    .if(body("status").equals("OPEN"))
    .optional()
    .isIn(["FIXED", "HOURLY"])
    .withMessage("Invalid budget type"),

  body("budgetMin")
    .if(body("status").equals("OPEN"))
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage("Minimum budget must be a number"),

  body("budgetMax")
    .if(body("status").equals("OPEN"))
    .optional({ checkFalsy: true })
    .isNumeric()
    .withMessage("Maximum budget must be a number"),

  body("skillsRequired")
    .if(body("status").equals("OPEN"))
    .isArray({ min: 1 })
    .withMessage("At least one skill is required"),

  body("experienceLevel")
    .if(body("status").equals("OPEN"))
    .optional()
    .isIn(["ENTRY", "INTERMEDIATE", "EXPERT"])
    .withMessage("Invalid experience level"),

  body("duration")
    .if(body("status").equals("OPEN"))
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Duration must be a string"),

  body("status")
    .optional()
    .isIn(["DRAFT", "OPEN"])
    .withMessage("Invalid status"),
    
  body("checklist")
    .optional()
    .isArray()
    .withMessage("Checklist must be an array of strings"),
];

export const updateProjectRules = [
  param("id").isUUID().withMessage("Invalid project ID"),
  ...createProjectRules.map(rule => rule.optional()),
];

export const getProjectsRules = [
  query("category").optional().trim(),
  query("status").optional().isIn(["OPEN", "COMPLETED", "CANCELLED"]),
  query("search").optional().trim(),
];
