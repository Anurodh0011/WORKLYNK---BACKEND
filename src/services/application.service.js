import prisma from "../prisma/client.js";

export const applyForProject = async (projectId, freelancerId, data) => {
  // Check if project exists and is OPEN
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  if (project.status !== "OPEN") {
    throw new Error("This project is no longer accepting applications");
  }

  // Check if client is trying to apply to their own project
  if (project.clientId === freelancerId) {
    throw new Error("You cannot apply to your own project");
  }

  // Check if already applied
  const existingApplication = await prisma.application.findFirst({
    where: {
      projectId,
      freelancerId,
    },
  });

  if (existingApplication) {
    throw new Error("You have already applied for this project");
  }

  // Create application
  return await prisma.application.create({
    data: {
      projectId,
      freelancerId,
      bidAmount: parseFloat(data.bidAmount),
      proposal: data.proposal,
      estimatedDays: parseInt(data.estimatedDays),
      attachments: data.attachments || [],
      status: "PENDING",
    },
  });
};

export const getProjectApplications = async (projectId, clientId) => {
  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, clientId },
  });

  if (!project) {
    throw new Error("Unauthorized or project not found");
  }

  return await prisma.application.findMany({
    where: { projectId },
    include: {
      freelancer: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getUserApplications = async (freelancerId) => {
  return await prisma.application.findMany({
    where: { freelancerId },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          status: true,
          budgetType: true,
          budgetMin: true,
          budgetMax: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const updateApplicationStatus = async (applicationId, userId, role, status) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { project: true },
  });

  if (!application) {
    throw new Error("Application not found");
  }

  // Authorization logic
  if (role === "CLIENT") {
    if (application.project.clientId !== userId) {
      throw new Error("Unauthorized to update this application");
    }
    // Clients can only ACCEPT or REJECT
    if (!["ACCEPTED", "REJECTED"].includes(status)) {
        throw new Error("Invalid status update for client");
    }
  } else if (role === "FREELANCER") {
    if (application.freelancerId !== userId) {
      throw new Error("Unauthorized to withdraw this application");
    }
    // Freelancers can only WITHDRAW
    if (status !== "WITHDRAWN") {
        throw new Error("Invalid status update for freelancer");
    }
  } else if (role !== "ADMIN") {
      throw new Error("Unauthorized");
  }

  return await prisma.application.update({
    where: { id: applicationId },
    data: { status },
  });
};
