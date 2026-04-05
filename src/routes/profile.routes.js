import { Router } from "express";
import { authenticate, tryAuthenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import * as profileController from "../controllers/profile.controller.js";
import upload from "../middleware/multer.js";

const router = Router();

// Routes for logged in users (CLIENT, FREELANCER, ADMIN)
router.get("/", authenticate, profileController.getMyProfile);
router.put("/", authenticate, upload.single('profilePicture'), profileController.updateProfile);
router.post("/verify", authenticate, upload.single('documentImage'), profileController.submitVerification);

// Public route for viewing any profile
router.get("/public/:userId", tryAuthenticate, profileController.getPublicProfile);

// Admin Routes for Verifying PAN/VAT
router.get("/all", authenticate, authorize("ADMIN"), profileController.getAllProfiles);
router.put("/admin-verify/:profileId", authenticate, authorize("ADMIN"), profileController.verifyByAdmin);

export default router;
