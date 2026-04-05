import * as profileService from "../services/profile.service.js";
import { successResponse, errorResponse } from "../helpers/response.helper.js";

// @route   GET /api/profile
// @desc    Get current user profile
// @access  Private
export const getMyProfile = async (req, res, next) => {
  try {
    const profile = await profileService.getProfileByUserId(req.user.id);
    return successResponse(res, "Profile fetched successfully", { profile });
  } catch (error) {
    next(error);
  }
};

export const getPublicProfile = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const profile = await profileService.getPublicProfileByUserId(userId);
    return successResponse(res, "Public profile fetched successfully", { profile });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/profile
// @desc    Update profile information
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const profile = await profileService.updateProfileInfo(req.user.id, req.body);
    return successResponse(res, "Profile updated successfully", { profile });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/profile/verify
// @desc    Submit PAN/VAT verification
// @access  Private
export const submitVerification = async (req, res, next) => {
  try {
    const { panVatNumber, documentType } = req.body;
    let { documentImage } = req.body;

    if (req.file) {
      documentImage = req.file.path;
    }

    if (!panVatNumber || !documentType) {
      return errorResponse(res, "PAN/VAT number and type are required", null, 400);
    }
    const profile = await profileService.submitVerificationInfo(req.user.id, { panVatNumber, documentImage, documentType });
    return successResponse(res, "Verification submitted successfully", { profile });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/profile/all
// @desc    Get all profiles (Admin only)
// @access  Private (ADMIN)
export const getAllProfiles = async (req, res, next) => {
  try {
    const { status } = req.query;
    const profiles = await profileService.getAllProfiles(status);
    return successResponse(res, "Profiles fetched successfully", { profiles });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/profile/admin-verify/:profileId
// @desc    Verify PAN/VAT
// @access  Private (ADMIN)
export const verifyByAdmin = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    const { profileId } = req.params;
    
    if (!["VERIFIED", "REJECTED"].includes(status)) {
      return errorResponse(res, "Invalid status. Must be VERIFIED or REJECTED", null, 400);
    }
    
    if (status === "REJECTED" && !rejectionReason) {
      return errorResponse(res, "Rejection reason is required when rejecting verification", null, 400);
    }

    const profile = await profileService.verifyProfileAdmin(profileId, status, rejectionReason);
    return successResponse(res, "Profile verification status updated", { profile });
  } catch (error) {
    next(error);
  }
};
