import prisma from "../prisma/client.js";

// Initialize profile if it doesn't exist
export const getProfileByUserId = async (userId) => {
  let profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      user: {
        select: { phoneNumber: true, name: true, email: true }
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
