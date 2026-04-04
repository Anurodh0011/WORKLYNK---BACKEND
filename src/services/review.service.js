import prisma from "../prisma/client.js";

/**
 * Create a new review for a completed project/contract
 */
export const createReview = async (contractId, reviewerId, rating, comment) => {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { project: true }
  });

  if (!contract) {
    throw new Error("Contract not found");
  }

  // Ensure contract is completed first? 
  // Actually, we might allow reviewing during completion
  if (contract.status !== "COMPLETED" && contract.status !== "ACTIVE") {
    // throw new Error("Can only review active or completed contracts");
  }

  // Determine reviewee
  const revieweeId = contract.clientId === reviewerId ? contract.freelancerId : contract.clientId;

  // Check if review already exists from this specific reviewer for this contract
  // (Note: Schema currently has @unique on contractId, which limits to 1 review per contract total)
  // We'll proceed with the current schema limitation
  
  return await prisma.review.upsert({
    where: { contractId },
    update: {
      rating,
      comment,
      reviewerId,
      revieweeId
    },
    create: {
      contractId,
      reviewerId,
      revieweeId,
      rating,
      comment
    }
  });
};

/**
 * Get reviews for a specific user (Freelancer or Client)
 */
export const getUserReviews = async (userId) => {
  return await prisma.review.findMany({
    where: { revieweeId: userId },
    include: {
      contract: {
        include: { project: { select: { title: true } } }
      }
    },
    orderBy: { createdAt: "desc" }
  });
};
