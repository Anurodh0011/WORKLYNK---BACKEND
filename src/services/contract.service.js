import prisma from "../prisma/client.js";

/**
 * Accepts a project application and creates a formal contract.
 * Updates project status to IN_PROGRESS.
 */
export const acceptApplication = async (applicationId, clientId) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch application with project info
    const application = await tx.application.findUnique({
      where: { id: applicationId },
      include: { 
        project: true,
        freelancer: true 
      },
    });

    if (!application) {
      throw new Error("Application not found");
    }

    if (application.project.clientId !== clientId) {
      throw new Error("Unauthorized to accept this application");
    }

    if (application.status !== "PENDING") {
      throw new Error(`Application cannot be accepted in current status: ${application.status}`);
    }

    // 2. Create the Contract
    const contract = await tx.contract.create({
      data: {
        projectId: application.projectId,
        clientId: clientId,
        freelancerId: application.freelancerId,
        applicationId: application.id,
        title: application.project.title,
        description: application.proposal,
        totalAmount: application.bidAmount,
        status: "ACTIVE",
      },
    });

    // 3. Update Application Status
    await tx.application.update({
      where: { id: applicationId },
      data: { status: "ACCEPTED" },
    });

    // 4. Update Project Status to IN_PROGRESS
    await tx.project.update({
      where: { id: application.projectId },
      data: { status: "IN_PROGRESS" },
    });

    // 5. (Optional) Reject other applications
    await tx.application.updateMany({
      where: {
        projectId: application.projectId,
        id: { not: applicationId },
        status: "PENDING",
      },
      data: { status: "REJECTED" },
    });

    return contract;
  });
};

/**
 * Get contract details by ID
 */
export const getContractById = async (contractId, userId) => {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      project: true,
      client: {
        select: { id: true, name: true, email: true }
      },
      freelancer: {
        select: { id: true, name: true, email: true }
      },
      milestones: true,
    },
  });

  if (!contract) {
    throw new Error("Contract not found");
  }

  // Ensure user is part of the contract
  if (contract.clientId !== userId && contract.freelancerId !== userId) {
    throw new Error("Unauthorized access to contract");
  }

  return contract;
};

/**
 * Get all contracts for a user (as client or freelancer)
 */
export const getUserContracts = async (userId, role) => {
  const where = role === "CLIENT" ? { clientId: userId } : { freelancerId: userId };
  
  return await prisma.contract.findMany({
    where,
    include: {
      project: {
        select: { title: true, category: true }
      },
      client: { select: { name: true } },
      freelancer: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};
