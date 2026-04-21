import { jest } from '@jest/globals';

jest.unstable_mockModule('../../prisma/client.js', () => ({
  default: {
    contract: { findUnique: jest.fn() },
    boardColumn: {
      findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(),
    },
    columnFeedback: { create: jest.fn() },
    taskFeedback: { create: jest.fn() },
    task: {
      findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn(),
    },
    milestone: { update: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(async (cb) => {
      const pm = (await import('../../prisma/client.js')).default;
      if (Array.isArray(cb)) return Promise.all(cb);
      return await cb(pm);
    }),
  }
}));

const kanbanService = await import('../../services/kanban.service.js');
const prisma = (await import('../../prisma/client.js')).default;

describe('KanbanService Test Suite (Exhaustive)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('renameColumn()', () => {
    it('should rename column if authorized', async () => {
      prisma.boardColumn.findUnique.mockResolvedValue({ id: 'col1', contract: { clientId: 'u1' } });
      await kanbanService.renameColumn('col1', 'New Name', 'u1');
      expect(prisma.boardColumn.update).toHaveBeenCalledWith(expect.objectContaining({ data: { name: 'New Name' } }));
    });
  });

  describe('addTaskFeedback()', () => {
    it('should allow only client to add feedback', async () => {
      prisma.task.findUnique.mockResolvedValue({ id: 't1', contract: { clientId: 'client-id' } });
      await kanbanService.addTaskFeedback('t1', 'Fix this', 'client-id');
      expect(prisma.taskFeedback.create).toHaveBeenCalled();
    });

    it('should throw if freelancer tries to add feedback', async () => {
      prisma.task.findUnique.mockResolvedValue({ id: 't1', contract: { clientId: 'client-id', freelancerId: 'f1' } });
      await expect(kanbanService.addTaskFeedback('t1', 'Fix this', 'f1')).rejects.toThrow('Only client');
    });
  });

  describe('confirmPayment()', () => {
    it('should move status to PAID if awaiting payment', async () => {
      prisma.contract.findUnique.mockResolvedValue({ freelancerId: 'f1' });
      prisma.milestone.findUnique.mockResolvedValue({ id: 'm1', status: 'AWAITING_PAYMENT' });
      await kanbanService.confirmPayment('m1', 'c1', 'f1');
      expect(prisma.milestone.update).toHaveBeenCalledWith(expect.objectContaining({ 
        data: expect.objectContaining({ status: 'PAID' }) 
      }));
    });
  });

  describe('deleteColumn()', () => {
    it('should logically delete tasks when column is deleted', async () => {
      prisma.boardColumn.findUnique.mockResolvedValue({ id: 'col1', contract: { clientId: 'u1' } });
      await kanbanService.deleteColumn('col1', 'u1');
      expect(prisma.task.deleteMany).toHaveBeenCalledWith({ where: { columnId: 'col1' } });
      expect(prisma.boardColumn.delete).toHaveBeenCalledWith({ where: { id: 'col1' } });
    });
  });
});
