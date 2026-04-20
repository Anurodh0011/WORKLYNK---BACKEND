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
