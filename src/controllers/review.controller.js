import * as reviewService from "../services/review.service.js";
import { successResponse } from "../helpers/response.helper.js";
import prisma from "../prisma/client.js";

/**
 * Handle individual project review submission (rating + comment)
 */
export const submitReview = async (req, res) => {
  try {
    const { contractId, comment } = req.body;
    const rating = parseInt(req.body.rating, 10);
    const reviewerId = req.user.id;
    
    // Server-side validation
    if (!contractId || isNaN(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid review parameters. Required: contractId, rating (1-5)." 
      });
    }

    const review = await reviewService.createReview(contractId, reviewerId, rating, comment?.trim());
    
    return successResponse(res, "Review submitted successfully", review);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Handle direct contract completion trigger (FREELANCER only)
 */
export const completeContractTrigger = async (req, res) => {
  try {
    const { contractId } = req.params;
    const userId = req.user.id;
    
    // Note: We might want to move this into a specialized service
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { milestones: true }
    });

    if (!contract || contract.freelancerId !== userId) {
      throw new Error("Unauthorized or contract not found");
    }

    // Force completion if all milestones paid? 
    // The service handles this logic but let's expose it as an explicit route
    const allPaid = contract.milestones.every(m => m.status === "PAID");
    if (!allPaid) {
      throw new Error("Cannot complete: Unpaid milestones still remain.");
    }

    const updated = await prisma.contract.update({
      where: { id: contractId },
      data: { 
        status: "COMPLETED",
        endDate: new Date()
      },
      include: { project: true }
    });

    // Also update project
    await prisma.project.update({
      where: { id: updated.projectId },
      data: { status: "COMPLETED" }
    });

    return successResponse(res, "Contract marked as completed.", updated);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
