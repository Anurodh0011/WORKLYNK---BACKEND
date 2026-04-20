import { jest } from '@jest/globals';

jest.unstable_mockModule('../../prisma/client.js', () => ({
  default: {
    savedProject: { create: jest.fn(), delete: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    savedFreelancer: { create: jest.fn(), delete: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() }
  }
}));

const bookmarkService = await import('../../services/bookmark.service.js');
const prisma = (await import('../../prisma/client.js')).default;

describe('BookmarkService Test Suite (Exhaustive)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('toggleProjectBookmark()', () => {
    it('should create a bookmark if it does not exist', async () => {
      prisma.savedProject.findUnique.mockResolvedValue(null);
      const result = await bookmarkService.toggleProjectBookmark('u1', 'p1');
      expect(result.bookmarked).toBe(true);
      expect(prisma.savedProject.create).toHaveBeenCalled();
    });

    it('should delete a bookmark if it already exists', async () => {
      prisma.savedProject.findUnique.mockResolvedValue({ id: 'b1' });
      const result = await bookmarkService.toggleProjectBookmark('u1', 'p1');
      expect(result.bookmarked).toBe(false);
      expect(prisma.savedProject.delete).toHaveBeenCalled();
    });
  });

  describe('getSavedProjects()', () => {
    it('should return all bookmarked projects for a user', async () => {
      prisma.savedProject.findMany.mockResolvedValue([{ id: 'b1', project: { title: 'P1' } }]);
      const res = await bookmarkService.getSavedProjects('u1');
      expect(res).toHaveLength(1);
      expect(res[0].project.title).toBe('P1');
    });
  });

  describe('getSavedFreelancers()', () => {
    it('should return all bookmarked freelancers for a client', async () => {
      prisma.savedFreelancer.findMany.mockResolvedValue([{ id: 'b2', freelancer: { name: 'F1' } }]);
      const res = await bookmarkService.getSavedFreelancers('c1');
      expect(res).toHaveLength(1);
    });
  });
});
