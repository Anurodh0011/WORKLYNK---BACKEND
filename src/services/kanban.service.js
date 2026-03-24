import prisma from "../prisma/client.js";

/**
 * Get board data including columns and tasks
 */
export const getBoardData = async (contractId, userId) => {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { 
      id: true, 
      clientId: true, 
      freelancerId: true, 
      project: { select: { title: true } } 
    }
  });

  if (!contract || (contract.clientId !== userId && contract.freelancerId !== userId)) {
    throw new Error("Unauthorized or contract not found");
  }

  const columns = await prisma.boardColumn.findMany({
    where: { contractId },
    include: {
      tasks: {
        orderBy: { order: "asc" }
      }
    },
    orderBy: { order: "asc" }
  });

  return { columns, contract };
};

/**
 * Update column name
 */
export const renameColumn = async (columnId, name, userId) => {
  const column = await prisma.boardColumn.findUnique({
    where: { id: columnId },
    include: { contract: true }
  });

  if (!column || (column.contract.clientId !== userId && column.contract.freelancerId !== userId)) {
    throw new Error("Unauthorized or column not found");
  }

  return await prisma.boardColumn.update({
    where: { id: columnId },
    data: { name }
  });
};

/**
 * Create a new task in a column
 */
export const createTask = async (contractId, columnId, data, userId) => {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId }
  });

  if (!contract || (contract.clientId !== userId && contract.freelancerId !== userId)) {
    throw new Error("Unauthorized or contract not found");
  }

  // Find max order in the column
  const lastTask = await prisma.task.findFirst({
    where: { columnId },
    orderBy: { order: "desc" }
  });

  const nextOrder = (lastTask?.order ?? -1) + 1;

  return await prisma.task.create({
    data: {
      contractId,
      columnId,
      title: data.title,
      description: data.description,
      order: nextOrder
    }
  });
};

/**
 * Move task to a new column or reorder
 */
export const moveTask = async (taskId, targetColumnId, newOrder, userId) => {
  return await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      include: { contract: true }
    });

    if (!task || (task.contract.clientId !== userId && task.contract.freelancerId !== userId)) {
      throw new Error("Unauthorized or task not found");
    }

    const sourceColumnId = task.columnId;

    if (sourceColumnId === targetColumnId) {
      // Reordering in same column (already verified above)
      const oldOrder = task.order;
      
      if (oldOrder < newOrder) {
        await tx.task.updateMany({
          where: { columnId: targetColumnId, order: { gt: oldOrder, lte: newOrder } },
          data: { order: { decrement: 1 } }
        });
      } else {
        await tx.task.updateMany({
          where: { columnId: targetColumnId, order: { gte: newOrder, lt: oldOrder } },
          data: { order: { increment: 1 } }
        });
      }
    } else {
      // Moving to different column
      await tx.task.updateMany({
        where: { columnId: sourceColumnId, order: { gt: task.order } },
        data: { order: { decrement: 1 } }
      });

      await tx.task.updateMany({
        where: { columnId: targetColumnId, order: { gte: newOrder } },
        data: { order: { increment: 1 } }
      });
    }

    return await tx.task.update({
      where: { id: taskId },
      data: { 
        columnId: targetColumnId,
        order: newOrder
      }
    });
  });
};
