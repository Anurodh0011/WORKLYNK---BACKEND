import { jest } from '@jest/globals';

jest.unstable_mockModule('../../prisma/client.js', () => ({
  default: {
    contract: { findUnique: jest.fn() },
    review: { upsert: jest.fn(), findMany: jest.fn() }
  }
}));

const reviewService = await import('../../services/review.service.js');
const prisma = (await import('../../prisma/client.js')).default;

describe('ReviewService Test Suite (Exhaustive)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReview()', () => {
    it('should assign freelancer as reviewee if client is reviewer', async () => {
      prisma.contract.findUnique.mockResolvedValue({ id: 'c1', clientId: 'u1', freelancerId: 'f1' });
      prisma.review.upsert.mockResolvedValue({});
      await reviewService.createReview('c1', 'u1', 5, 'Good');
      expect(prisma.review.upsert).toHaveBeenCalledWith(expect.objectContaining({
        create: expect.objectContaining({ reviewerId: 'u1', revieweeId: 'f1' })
      }));
    });

    it('should assign client as reviewee if freelancer is reviewer', async () => {
      prisma.contract.findUnique.mockResolvedValue({ id: 'c1', clientId: 'u1', freelancerId: 'f1' });
      prisma.review.upsert.mockResolvedValue({});
      await reviewService.createReview('c1', 'f1', 4, 'Payed on time');
      expect(prisma.review.upsert).toHaveBeenCalledWith(expect.objectContaining({
        create: expect.objectContaining({ reviewerId: 'f1', revieweeId: 'u1' })
      }));
    });
  });

  describe('getUserReviews()', () => {
    it('should fetch all reviews received by a user', async () => {
      prisma.review.findMany.mockResolvedValue([{ id: 'r1', rating: 5 }]);
      const res = await reviewService.getUserReviews('u1');
      expect(res).toHaveLength(1);
    });
  });
});
