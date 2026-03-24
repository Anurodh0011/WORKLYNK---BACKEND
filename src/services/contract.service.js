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
        status: "DRAFT",
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

/**
 * Update contract terms (description and milestones)
 */
export const updateContract = async (contractId, clientId, data) => {
  const { description, milestones } = data;

  return await prisma.$transaction(async (tx) => {
    // 1. Verify contract ownership
    const contract = await tx.contract.findUnique({
      where: { id: contractId }
    });

    if (!contract || contract.clientId !== clientId) {
      const error = new Error("Unauthorized or contract not found");
      error.statusCode = 403;
      throw error;
    }

    if (contract.status !== "DRAFT" && contract.status !== "PENDING_FREELANCER") {
      const error = new Error("Cannot edit contract in its current status");
      error.statusCode = 400;
      throw error;
    }

    // 2. Update basic info
    const updatedContract = await tx.contract.update({
      where: { id: contractId },
      data: { description },
      include: { milestones: true }
    });

    // 3. Sync Milestones (Basic implementation: delete all and recreate)
    if (milestones && Array.isArray(milestones)) {
      // Delete existing
      await tx.milestone.deleteMany({
        where: { contractId }
      });

      // Create new ones
      if (milestones.length > 0) {
        await tx.milestone.createMany({
          data: milestones.map(m => ({
            contractId,
            title: m.title,
            description: m.description,
            amount: parseFloat(m.amount),
            dueDate: m.dueDate ? new Date(m.dueDate) : null,
            status: "PENDING"
          }))
        });
      }
    }

    // Return updated contract with milestones
    return await tx.contract.findUnique({
      where: { id: contractId },
      include: { milestones: true, project: true, freelancer: { select: { name: true, email: true } } }
    });
  });
};

/**
 * Send contract to freelancer for review
 */
export const sendContractToFreelancer = async (contractId, clientId) => {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId }
  });

  if (!contract || contract.clientId !== clientId) {
    const error = new Error("Unauthorized or contract not found");
    error.statusCode = 403;
    throw error;
  }

  if (contract.status !== "DRAFT") {
    const error = new Error("Contract must be in DRAFT status to send");
    error.statusCode = 400;
    throw error;
  }

  return await prisma.contract.update({
    where: { id: contractId },
    data: { status: "PENDING_FREELANCER" },
    include: { project: true, freelancer: { select: { name: true, email: true } } }
  });
};
