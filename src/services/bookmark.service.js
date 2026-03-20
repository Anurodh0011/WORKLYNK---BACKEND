import prisma from "../prisma/client.js";

/**
 * Toggle project bookmark for a user
 */
export async function toggleProjectBookmark(userId, projectId) {
  const existing = await prisma.savedProject.findUnique({
    where: {
      userId_projectId: { userId, projectId }
    }
  });

  if (existing) {
    await prisma.savedProject.delete({
      where: { id: existing.id }
    });
    return { bookmarked: false };
  } else {
    await prisma.savedProject.create({
      data: { userId, projectId }
    });
    return { bookmarked: true };
  }
}

/**
 * Toggle freelancer bookmark for a client
 */
export async function toggleFreelancerBookmark(clientId, freelancerId) {
  const existing = await prisma.savedFreelancer.findUnique({
    where: {
      clientId_freelancerId: { clientId, freelancerId }
    }
  });

  if (existing) {
    await prisma.savedFreelancer.delete({
      where: { id: existing.id }
    });
    return { bookmarked: false };
  } else {
    await prisma.savedFreelancer.create({
      data: { clientId, freelancerId }
    });
    return { bookmarked: true };
  }
}

/**
 * Get all projects saved by a user
 */
export async function getSavedProjects(userId) {
  return await prisma.savedProject.findMany({
    where: { userId },
    include: {
      project: {
        include: {
          client: {
            select: { name: true, profile: { select: { profilePicture: true } } }
          },
          _count: { select: { applications: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Get all freelancers saved by a client
 */
export async function getSavedFreelancers(clientId) {
  return await prisma.savedFreelancer.findMany({
    where: { clientId },
    include: {
      freelancer: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}
