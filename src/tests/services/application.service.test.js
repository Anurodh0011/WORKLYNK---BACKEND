import { jest } from '@jest/globals';

jest.unstable_mockModule('../../prisma/client.js', () => ({
  default: {
    project: { findUnique: jest.fn(), findFirst: jest.fn() },
    application: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() }
  }
}));

const applicationService = await import('../../services/application.service.js');
const prisma = (await import('../../prisma/client.js')).default;

describe('ApplicationService Test Suite (Exhaustive)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('applyForProject()', () => {
    it('should successfully apply for an OPEN project', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'p1', status: 'OPEN', clientId: 'c1' });
      prisma.application.findUnique.mockResolvedValue(null);
      prisma.application.create.mockResolvedValue({ id: 'a1', status: 'PENDING' });

      const result = await applicationService.applyForProject('p1', 'f1', { proposal: 'Hi' });
      expect(result.status).toBe('PENDING');
    });

    it('should update existing DRAFT if re-applying', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'p1', status: 'OPEN', clientId: 'c1' });
      prisma.application.findUnique.mockResolvedValue({ id: 'a1', status: 'DRAFT' });
      
      await applicationService.applyForProject('p1', 'f1', { status: 'PENDING' });
      expect(prisma.application.update).toHaveBeenCalled();
    });

    it('should prevent user from applying to their own project', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'p1', status: 'OPEN', clientId: 'u1' });
      await expect(applicationService.applyForProject('p1', 'u1', {}))
        .rejects.toThrow('You cannot apply to your own project');
    });

    it('should throw if already applied (not draft)', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'p1', status: 'OPEN' });
      prisma.application.findUnique.mockResolvedValue({ status: 'PENDING' });
      await expect(applicationService.applyForProject('p1', 'f1', {}))
        .rejects.toThrow('already submitted');
    });
  });

  describe('getProjectApplications()', () => {
    it('should throw if user is not the project owner', async () => {
      prisma.project.findFirst.mockResolvedValue(null);
      await expect(applicationService.getProjectApplications('p1', 'wrong-user'))
        .rejects.toThrow('Unauthorized');
    });

    it('should return many applications for valid owner', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'p1' });
      prisma.application.findMany.mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]);
      const res = await applicationService.getProjectApplications('p1', 'owner');
      expect(res).toHaveLength(2);
    });
  });

  describe('updateApplicationStatus()', () => {
    it('should allow freelancer to WITHDRAW their own application', async () => {
      prisma.application.findUnique.mockResolvedValue({ id: 'a1', freelancerId: 'f1', project: {} });
      await applicationService.updateApplicationStatus('a1', 'f1', 'FREELANCER', 'WITHDRAWN');
      expect(prisma.application.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'WITHDRAWN' } }));
    });
  });
});
