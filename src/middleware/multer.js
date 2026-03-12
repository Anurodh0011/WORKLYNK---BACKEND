// ─── Multer Config ──────────────────────────────────────────
// Middleware to handle multipart/form-data requests

import multer from "multer";

// We use memory storage because we just need to parse fields
// If we needed file uploads, we'd configure disk storage or a cloud provider
const storage = multer.memoryStorage();

// This middleware parses any multipart/form-data and makes it available in req.body
// We use .any() to allow any fields, but it's restricted to text fields unless we handle files
export const parseMultipart = multer({ storage }).any();
