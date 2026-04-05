import prisma from "../prisma/client.js";

// Initialize profile if it doesn't exist
export const getProfileByUserId = async (userId) => {
  let profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      user: {
        select: { 
          phoneNumber: true, 
          name: true, 
          email: true,
          contractsAsClient: {
            where: { status: { in: ["ACTIVE", "COMPLETED"] } },
            include: { project: { select: { title: true } } }
          },
          contractsAsFreelancer: {
            where: { status: { in: ["ACTIVE", "COMPLETED"] } },
            include: { project: { select: { title: true } } }
          }
        }
      }
    }
  });

  if (!profile) {
    profile = await prisma.profile.create({
      data: { userId },
    });
  }
  return profile;
};

// Fetch public profile by userId including reviews
export const getPublicProfileByUserId = async (userId) => {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          contractsAsClient: {
            where: { status: { in: ["COMPLETED"] } },
            include: { project: { select: { title: true } } }
          },
          contractsAsFreelancer: {
            where: { status: { in: ["COMPLETED"] } },
            include: { project: { select: { title: true } } }
          },
          reviewsReceived: {
            include: {
              reviewer: {
                select: { name: true, profile: { select: { profilePicture: true } } }
              }
            },
            orderBy: { createdAt: "desc" }
          }
        }
      }
    }
  });

  if (!profile) {
    throw new Error("Profile not found");
  }

  // Calculate average rating
  let averageRating = 0;
  if (profile.user.reviewsReceived && profile.user.reviewsReceived.length > 0) {
    const total = profile.user.reviewsReceived.reduce((acc, r) => acc + r.rating, 0);
    averageRating = Number((total / profile.user.reviewsReceived.length).toFixed(1));
  }

  return { ...profile, averageRating };
};

// Update profile basic info
export const updateProfileInfo = async (userId, data) => {
  const { profilePicture, description, skills, education, experience, portfolio, hourlyRate, headline, certifications } = data;
  const updateData = { profilePicture, description, skills, education, experience, portfolio, hourlyRate, headline, certifications };
  
  // Clean undefined keys so we don't overwrite with undefined
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

  // Update User table if phoneNumber is provided
  if (data.phoneNumber !== undefined) {
    await prisma.user.update({
      where: { id: userId },
      data: { phoneNumber: data.phoneNumber },
    });
  }

  return await prisma.profile.upsert({
    where: { userId },
    update: updateData,
    create: { userId, ...updateData },
    include: {
      user: {
        select: { phoneNumber: true, name: true, email: true }
      }
    }
  });
};

// Submit verification details (PAN/VAT)
export const submitVerificationInfo = async (userId, data) => {
  const { panVatNumber, documentImage, documentType } = data;
  return await prisma.profile.upsert({
    where: { userId },
    update: { 
      panVatNumber, 
      documentImage, 
      documentType,
      verificationStatus: "PENDING",
      rejectionReason: null 
    },
    create: { 
      userId, 
      panVatNumber, 
      documentImage, 
      documentType,
      verificationStatus: "PENDING" 
    },
  });
};

// Admin: Get all profiles to view verification statuses
export const getAllProfiles = async (status) => {
  const query = status ? { verificationStatus: status } : {};
  return await prisma.profile.findMany({
    where: query,
    include: {
      user: {
        select: { name: true, email: true, role: true, phoneNumber: true }
      }
    },
    orderBy: { updatedAt: "desc" }
  });
};

// Admin: Approve or reject verification
export const verifyProfileAdmin = async (profileId, status, rejectionReason) => {
  return await prisma.profile.update({
    where: { id: profileId },
    data: { 
      verificationStatus: status, 
      rejectionReason: rejectionReason || null 
    },
  });
};
