import { jest } from '@jest/globals';

jest.unstable_mockModule('../../prisma/client.js', () => ({
  default: {
    user: { findMany: jest.fn() }
  }
}));

const freelancerService = await import('../../services/freelancer.service.js');
const prisma = (await import('../../prisma/client.js')).default;

describe('FreelancerService Test Suite (Exhaustive)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFreelancers()', () => {
    it('should combine skill filters and search terms in the query', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await freelancerService.getFreelancers({ skills: ['React'], search: 'Designer' });

      const callArgs = prisma.user.findMany.mock.calls[0][0];
      expect(callArgs.where.role).toBe('FREELANCER');
      expect(callArgs.where.profile.skills.hasSome).toEqual(['React']);
      expect(callArgs.where.profile.OR).toBeDefined(); // headline/description search
    });

    it('should default to empty filters and return all freelancers', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'f1' }]);
      const res = await freelancerService.getFreelancers({});
      expect(res).toHaveLength(1);
    });
  });
});
