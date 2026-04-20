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

    // 3. Update Application Status to OFFERSENT or ACCEPTED
    await tx.application.update({
      where: { id: applicationId },
      data: { status: "ACCEPTED" },
    });

    // NOTE: We do not freeze the project as IN_PROGRESS here,
    // protecting it only when the freelancer actively ACCEPTs the contract.
    // Other freelancers can still apply.

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
  const { description, milestones, startDate } = data;

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
      data: { 
        description,
        ...(startDate && { startDate: new Date(startDate) })
      },
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

/**
 * Freelancer responds to a contract offer (Accept or Reject/Negotiate)
 */
export const respondToContract = async (contractId, freelancerId, action, remarks) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Verify contract and freelancer
    const contract = await tx.contract.findUnique({
      where: { id: contractId },
      include: { project: true, milestones: true }
    });

    if (!contract || contract.freelancerId !== freelancerId) {
      const error = new Error("Unauthorized or contract not found");
      error.statusCode = 403;
      throw error;
    }

    if (contract.status !== "PENDING_FREELANCER") {
      const error = new Error("Contract is not in a state that can be responded to");
      error.statusCode = 400;
      throw error;
    }

    if (action === "ACCEPT") {
      // 2. Transition to ACTIVE
      const updatedContract = await tx.contract.update({
        where: { id: contractId },
        data: { 
          status: "ACTIVE",
          startDate: new Date(),
        }
      });

      // 2.5 Mark project as IN_PROGRESS, rejecting other applicants
      await tx.project.update({
        where: { id: contract.projectId },
        data: { status: "IN_PROGRESS" }
      });

      await tx.application.updateMany({
        where: {
          projectId: contract.projectId,
          id: { not: contract.applicationId },
          status: "PENDING",
        },
        data: { status: "REJECTED" },
      });

      // 3. Create default Kanban columns per milestone
      const defaultColumns = [
        "BackLog", "To-Do", "In Progress", "Testing", "Done", "Completed"
      ];

      const columnsData = [];
      contract.milestones.forEach((m) => {
        defaultColumns.forEach((name, index) => {
          columnsData.push({
            contractId,
            milestoneId: m.id,
            name,
            order: index
          });
        });
      });

      if (columnsData.length > 0) {
        await tx.boardColumn.createMany({
          data: columnsData
        });
      }

      return updatedContract;
    } else if (action === "REJECT") {
      // 2. Transition back to DRAFT for client to revise
      return await tx.contract.update({
        where: { id: contractId },
        data: { 
          status: "DRAFT",
          remarks: remarks || "Freelancer requested changes."
        }
      });
    } else {
      throw new Error("Invalid action. Must be ACCEPT or REJECT.");
    }
  });
};

/**
 * Freelancer marks contract as complete after all milestones are paid
 */
export const completeContract = async (contractId, freelancerId) => {
  return await prisma.$transaction(async (tx) => {
    const contract = await tx.contract.findUnique({
      where: { id: contractId },
      include: { milestones: true }
    });

    if (!contract || contract.freelancerId !== freelancerId) {
      const error = new Error("Unauthorized or contract not found");
      error.statusCode = 403;
      throw error;
    }

    if (contract.status !== "ACTIVE") {
      const error = new Error("Only active contracts can be completed");
      error.statusCode = 400;
      throw error;
    }

    const allPaid = contract.milestones.every(m => m.status === "PAID");
    if (!allPaid || contract.milestones.length === 0) {
      const error = new Error("Cannot complete contract until all milestones are paid by the client");
      error.statusCode = 400;
      throw error;
    }

    const updatedContract = await tx.contract.update({
      where: { id: contractId },
      data: { status: "COMPLETED", endDate: new Date() }
    });

    await tx.project.update({
      where: { id: contract.projectId },
      data: { status: "COMPLETED" }
    });

    return updatedContract;
  });
};

/**
 * Either party closes an active contract (manual close with confirmation)
 */
export const closeContract = async (contractId, userId) => {
  return await prisma.$transaction(async (tx) => {
    const contract = await tx.contract.findUnique({
      where: { id: contractId }
    });

    if (!contract) {
      const error = new Error("Contract not found");
      error.statusCode = 404;
      throw error;
    }

    if (contract.clientId !== userId && contract.freelancerId !== userId) {
      const error = new Error("Unauthorized to close this contract");
      error.statusCode = 403;
      throw error;
    }

    if (contract.status !== "ACTIVE") {
      const error = new Error("Only active contracts can be closed");
      error.statusCode = 400;
      throw error;
    }

    const updatedContract = await tx.contract.update({
      where: { id: contractId },
      data: { status: "COMPLETED", endDate: new Date() }
    });

    await tx.project.update({
      where: { id: contract.projectId },
      data: { status: "COMPLETED" }
    });

    return updatedContract;
  });
};
