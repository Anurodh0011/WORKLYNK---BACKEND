import { jest } from '@jest/globals';

jest.unstable_mockModule('../../prisma/client.js', () => ({
  default: {
    project: {
      create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(),
    },
    application: {
      findFirst: jest.fn(),
    },
    savedProject: {
      findUnique: jest.fn(),
    },
  }
}));

const projectService = await import('../../services/project.service.js');
const prisma = (await import('../../prisma/client.js')).default;

describe('ProjectService Test Suite (Exhaustive)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProjectById()', () => {
    it('should include myApplication details if userId is provided', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'p1', title: 'T' });
      prisma.application.findFirst.mockResolvedValue({ id: 'a1', status: 'PENDING' });
      prisma.savedProject.findUnique.mockResolvedValue({ id: 's1' });

      const result = await projectService.getProjectById('p1', 'u1');
      expect(result.myApplication.id).toBe('a1');
      expect(result.isBookmarked).toBe(true);
    });

    it('should return null if project does not exist', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      const res = await projectService.getProjectById('fake');
      expect(res).toBeNull();
    });
  });

  describe('getClientProjects()', () => {
    it('should fetch all projects created by a specific client', async () => {
      prisma.project.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      const res = await projectService.getClientProjects('c1');
      expect(res).toHaveLength(2);
      expect(prisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { clientId: 'c1' }
      }));
    });
  });
});
