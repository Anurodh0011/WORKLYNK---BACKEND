import { jest } from '@jest/globals';

jest.unstable_mockModule('../../prisma/client.js', () => ({
  default: {
    profile: { findUnique: jest.fn(), create: jest.fn(), upsert: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    user: { update: jest.fn() }
  }
}));

const profileService = await import('../../services/profile.service.js');
const prisma = (await import('../../prisma/client.js')).default;

describe('ProfileService Test Suite (Exhaustive)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateProfileInfo()', () => {
    it('should update user phone number if provided', async () => {
      prisma.profile.upsert.mockResolvedValue({ id: 'p1' });
      await profileService.updateProfileInfo('u1', { phoneNumber: '9841' });
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { phoneNumber: '9841' } }));
    });

    it('should ignore undefined keys in updateData', async () => {
      prisma.profile.upsert.mockResolvedValue({ id: 'p1' });
      await profileService.updateProfileInfo('u1', { description: 'Hi', skills: undefined });
      const upsertArgs = prisma.profile.upsert.mock.calls[0][0];
      expect(upsertArgs.update.skills).toBeUndefined();
    });
  });

  describe('getPublicProfileByUserId()', () => {
    it('should throw if profile not found', async () => {
      prisma.profile.findUnique.mockResolvedValue(null);
      await expect(profileService.getPublicProfileByUserId('fake')).rejects.toThrow('found');
    });
  });

  describe('verifyProfileAdmin()', () => {
    it('should allow admin to set status and rejection reason', async () => {
      prisma.profile.update.mockResolvedValue({ id: 'p1', verificationStatus: 'REJECTED' });
      const res = await profileService.verifyProfileAdmin('p1', 'REJECTED', 'Blurred image');
      expect(prisma.profile.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { verificationStatus: 'REJECTED', rejectionReason: 'Blurred image' }
      }));
    });
  });
});
