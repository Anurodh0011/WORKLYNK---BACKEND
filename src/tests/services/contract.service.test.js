import { jest } from '@jest/globals';

jest.unstable_mockModule('../../prisma/client.js', () => ({
  default: {
    application: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    contract: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    project: { update: jest.fn() },
    milestone: { deleteMany: jest.fn(), createMany: jest.fn() },
    boardColumn: { createMany: jest.fn() },
    $transaction: jest.fn(async (cb) => {
      const pm = (await import('../../prisma/client.js')).default;
      return await cb(pm);
    }),
  }
}));

const contractService = await import('../../services/contract.service.js');
const prisma = (await import('../../prisma/client.js')).default;

describe('ContractService Test Suite (Exhaustive)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateContract()', () => {
    it('should allow client to update draft contract milestones', async () => {
      prisma.contract.findUnique.mockResolvedValueOnce({ id: 'con1', clientId: 'c1', status: 'DRAFT' })
                                  .mockResolvedValueOnce({ id: 'con1', milestones: [{ id: 'm1' }] });
      prisma.contract.update.mockResolvedValue({ id: 'con1' });

      await contractService.updateContract('con1', 'c1', { description: 'New', milestones: [{ title: 'M1', amount: 50 }] });
      expect(prisma.milestone.deleteMany).toHaveBeenCalled();
      expect(prisma.milestone.createMany).toHaveBeenCalled();
    });

    it('should throw if contract is already ACTIVE', async () => {
      prisma.contract.findUnique.mockResolvedValue({ id: 'con1', clientId: 'c1', status: 'ACTIVE' });
      await expect(contractService.updateContract('con1', 'c1', {}))
        .rejects.toThrow('Cannot edit contract');
    });
  });

  describe('respondToContract()', () => {
    it('should transition to DRAFT with remarks on REJECT', async () => {
      prisma.contract.findUnique.mockResolvedValue({ id: 'con1', freelancerId: 'f1', status: 'PENDING_FREELANCER' });
      prisma.contract.update.mockResolvedValue({ status: 'DRAFT' });
      const res = await contractService.respondToContract('con1', 'f1', 'REJECT', 'Need more money');
      expect(res.status).toBe('DRAFT');
    });
  });

  describe('completeContract()', () => {
    it('should complete contract only if all milestones are PAID', async () => {
      prisma.contract.findUnique.mockResolvedValue({ 
        id: 'con1', freelancerId: 'f1', status: 'ACTIVE', 
        milestones: [{ status: 'PAID' }, { status: 'PAID' }]
      });
      prisma.contract.update.mockResolvedValue({ status: 'COMPLETED' });
      const res = await contractService.completeContract('con1', 'f1');
      expect(res.status).toBe('COMPLETED');
    });

    it('should throw if any milestone is still PENDING', async () => {
      prisma.contract.findUnique.mockResolvedValue({ 
        id: 'con1', freelancerId: 'f1', status: 'ACTIVE', 
        milestones: [{ status: 'PAID' }, { status: 'PENDING' }]
      });
      await expect(contractService.completeContract('con1', 'f1')).rejects.toThrow('milestones are paid');
    });
  });
});
