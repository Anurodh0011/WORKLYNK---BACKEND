import prisma from "../prisma/client.js";

/**
 * Get all verified freelancers with optional skill filters
 */
export async function getFreelancers(filters = {}) {
  const { skills, search } = filters;

  const where = {
    role: "FREELANCER",
    profile: {
      verificationStatus: "APPROVED",
      ...(skills && skills.length > 0 && {
        skills: { hasSome: skills }
      }),
      ...(search && {
        OR: [
          { headline: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ]
      })
    }
  };

  return await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      profile: true,
    },
    orderBy: { createdAt: 'desc' }
  });
}
