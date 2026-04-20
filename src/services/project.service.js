import prisma from "../prisma/client.js";

/**
 * Create a new project
 */
export async function createProject(clientId, projectData) {
  const { 
    title, 
    description, 
    category, 
    budgetType, 
    budgetMin, 
    budgetMax, 
    skillsRequired, 
    experienceLevel, 
    duration, 
    attachments, 
    checklist, 
    status 
  } = projectData;

  return await prisma.project.create({
    data: {
      clientId,
      title: title || "Untitled Project",
      description: description || "",
      category,
      budgetType,
      budgetMin: budgetMin ? parseFloat(budgetMin) : null,
      budgetMax: budgetMax ? parseFloat(budgetMax) : null,
      skillsRequired: skillsRequired || [],
      experienceLevel,
      duration,
      attachments,
      checklist,
      status: status || "DRAFT",
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: {
            select: {
              profilePicture: true,
            }
          }
        }
      }
    }
  });
}

/**
 * Update an existing project
 */
export async function updateProject(projectId, clientId, updateData) {
  // Ensure the project belongs to the client
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { _count: { select: { applications: true } } }
  });

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  if (project._count.applications > 0) {
    const error = new Error("Cannot edit project after freelancers have applied.");
    error.statusCode = 400;
    throw error;
  }

  if (project.clientId !== clientId) {
    const error = new Error("Unauthorized to update this project");
    error.statusCode = 403;
    throw error;
  }

  const { budgetMin, budgetMax, ...rest } = updateData;

  return await prisma.project.update({
    where: { id: projectId },
    data: {
      ...rest,
      budgetMin: budgetMin ? parseFloat(budgetMin) : undefined,
      budgetMax: budgetMax ? parseFloat(budgetMax) : undefined,
    },
  });
}

/**
 * Get projects with filters
 */
export async function getProjects(filters = {}) {
  const { category, status = "OPEN", search, skills, budgetType, experienceLevel, minBudget, maxBudget } = filters;

  const where = {
    status,
    ...(category && { category }),
    ...(budgetType && { budgetType }),
    ...(experienceLevel && { experienceLevel }),
    ...(minBudget && { budgetMin: { gte: parseFloat(minBudget) } }),
    ...(maxBudget && { budgetMax: { lte: parseFloat(maxBudget) } }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { skillsRequired: { hasSome: [search] } } // search in skills too
      ]
    }),
    ...(skills && skills.length > 0 && {
      skillsRequired: { hasSome: skills }
    })
  };

  return await prisma.project.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          profile: {
            select: {
              profilePicture: true,
            }
          }
        }
      },
      _count: {
        select: { applications: true }
      }
    }
  });
}

/**
 * Get project by ID
 */
export async function getProjectById(projectId, userId = null) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: {
            select: {
              description: true,
              profilePicture: true,
            }
          }
        }
      },
      _count: {
        select: { applications: true }
      }
    }
  });

  if (!project) return null;

  let myApplication = null;
  let isBookmarked = false;

  if (userId) {
    myApplication = await prisma.application.findFirst({
      where: {
        projectId,
        freelancerId: userId
      },
      select: {
        id: true,
        status: true,
        bidAmount: true,
        proposal: true,
        createdAt: true
      }
    });

    const bookmark = await prisma.savedProject.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId
        }
      }
    });
    isBookmarked = !!bookmark;
  }

  return {
    ...project,
    myApplication,
    isBookmarked
  };
}

/**
 * Get client's projects
 */
export async function getClientProjects(clientId) {
  return await prisma.project.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { applications: true }
      },
      contracts: {
        select: {
          id: true,
          status: true,
          milestones: {
            select: { id: true, title: true, status: true },
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });
}

/**
 * Close (cancel) a project - Client only
 */
export async function closeProject(projectId, clientId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { contracts: { where: { status: "ACTIVE" } } }
  });

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  if (project.clientId !== clientId) {
    const error = new Error("Unauthorized to close this project");
    error.statusCode = 403;
    throw error;
  }

  if (["COMPLETED", "CANCELLED"].includes(project.status)) {
    const error = new Error("Project is already closed or completed");
    error.statusCode = 400;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    // Reject all pending applications
    await tx.application.updateMany({
      where: { projectId, status: "PENDING" },
      data: { status: "REJECTED" }
    });

    // Update project status to CANCELLED
    return await tx.project.update({
      where: { id: projectId },
      data: { status: "CANCELLED" }
    });
  });
}

/**
 * Reopen a cancelled project - Client only
 */
export async function reopenProject(projectId, clientId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }

  if (project.clientId !== clientId) {
    const error = new Error("Unauthorized to reopen this project");
    error.statusCode = 403;
    throw error;
  }

  if (project.status !== "CANCELLED") {
    const error = new Error("Only cancelled projects can be reopened");
    error.statusCode = 400;
    throw error;
  }

  return await prisma.project.update({
    where: { id: projectId },
    data: { status: "OPEN" }
  });
}

/**
 * Get project by ID with full client stats
 */
export async function getProjectByIdWithClientStats(projectId, userId = null) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: {
            select: {
              description: true,
              profilePicture: true,
            }
          },
          contractsAsClient: {
            where: { status: { in: ["ACTIVE", "COMPLETED"] } },
            select: { id: true }
          },
          reviewsReceived: {
            select: { rating: true }
          }
        }
      },
      _count: {
        select: { applications: true }
      }
    }
  });

  if (!project) return null;

  // Calculate client stats
  const clientReviews = project.client.reviewsReceived || [];
  const clientAvgRating = clientReviews.length > 0
    ? Number((clientReviews.reduce((a, r) => a + r.rating, 0) / clientReviews.length).toFixed(1))
    : 0;
  const clientProjectCount = project.client.contractsAsClient?.length || 0;

  let myApplication = null;
  let isBookmarked = false;

  if (userId) {
    myApplication = await prisma.application.findFirst({
      where: { projectId, freelancerId: userId },
      select: {
        id: true,
        status: true,
        bidAmount: true,
        proposal: true,
        estimatedDuration: true,
        attachments: true,
        createdAt: true
      }
    });

    const bookmark = await prisma.savedProject.findUnique({
      where: { userId_projectId: { userId, projectId } }
    });
    isBookmarked = !!bookmark;
  }

  return {
    ...project,
    client: {
      ...project.client,
      projectCount: clientProjectCount,
      averageRating: clientAvgRating,
      reviewsReceived: undefined,
      contractsAsClient: undefined,
    },
    myApplication,
    isBookmarked
  };
}
