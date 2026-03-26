import prisma from "../prisma/client.js";

export const applyForProject = async (projectId, freelancerId, data) => {
  const status = data.status || "PENDING";
  
  // Check if project exists and is OPEN
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  if (project.status !== "OPEN" && status !== "DRAFT") {
    throw new Error("This project is no longer accepting applications");
  }

  // Check if client is trying to apply to their own project
  if (project.clientId === freelancerId) {
    throw new Error("You cannot apply to your own project");
  }

  // Check if already applied (including drafts)
  const existingApplication = await prisma.application.findUnique({
    where: {
      projectId_freelancerId: {
        projectId,
        freelancerId,
      },
    },
  });

  if (existingApplication && existingApplication.status !== "DRAFT") {
    throw new Error("You have already submitted an application for this project");
  }

  const applicationData = {
    projectId,
    freelancerId,
    bidAmount: data.bidAmount ? parseFloat(data.bidAmount) : 0,
    proposal: data.proposal || "",
    estimatedDuration: data.estimatedDays?.toString() || "",
    attachments: data.attachments || [],
    status: status,
  };

  if (existingApplication) {
    // Update existing draft
    return await prisma.application.update({
      where: { id: existingApplication.id },
      data: applicationData,
    });
  }

  // Create new application/draft
  return await prisma.application.create({
    data: applicationData,
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
      contract: true,
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
      contract: {
        select: {
          id: true,
          status: true,
        }
      }
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
