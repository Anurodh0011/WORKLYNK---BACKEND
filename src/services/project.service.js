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
  });

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
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
  const { category, status = "OPEN", search, skills } = filters;

  const where = {
    status,
    ...(category && { category }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
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
export async function getProjectById(projectId) {
  return await prisma.project.findUnique({
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
      applications: {
        include: {
          freelancer: {
            select: {
              name: true,
              profile: {
                select: {
                  profilePicture: true,
                  headline: true,
                }
              }
            }
          }
        }
      }
    }
  });
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
      }
    }
  });
}
