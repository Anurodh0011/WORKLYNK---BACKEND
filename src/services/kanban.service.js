import prisma from "../prisma/client.js";

/**
 * Get board data including columns and tasks
 */
export const getBoardData = async (contractId, userId, milestoneId) => {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { 
      project: { select: { title: true } },
      milestones: { orderBy: { createdAt: "asc" } },
      client: { select: { id: true, name: true, email: true, profile: { select: { profilePicture: true } } } },
      freelancer: { select: { id: true, name: true, email: true, profile: { select: { profilePicture: true } } } }
    }
  });

  if (!contract || (contract.clientId !== userId && contract.freelancerId !== userId)) {
    throw new Error("Unauthorized or contract not found");
  }

  const activeMilestoneId = milestoneId || (contract.milestones.length > 0 ? contract.milestones[0].id : null);

  let columns = await prisma.boardColumn.findMany({
    where: { contractId, milestoneId: activeMilestoneId },
    include: {
      tasks: {
        include: {
          feedbacks: {
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: { order: "asc" }
      },
      feedbacks: {
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { order: "asc" }
  });

  // Create default columns if none exist
  if (columns.length === 0 && activeMilestoneId) {
    const defaultColumns = [
      { name: "Backlog", color: "slate" },
      { name: "To Do", color: "blue" },
      { name: "In Progress", color: "amber" },
      { name: "Done", color: "green" },
      { name: "On Test", color: "purple" },
      { name: "Testing", color: "red" },
      { name: "Completed", color: "green" }
    ];

    await prisma.$transaction(
      defaultColumns.map((col, index) =>
        prisma.boardColumn.create({
          data: {
            contractId,
            milestoneId: activeMilestoneId,
            name: col.name,
            color: col.color,
            order: index
          }
        })
      )
    );

    // Fetch again
    columns = await prisma.boardColumn.findMany({
      where: { contractId, milestoneId: activeMilestoneId },
      include: {
      tasks: {
        include: {
          feedbacks: {
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: { order: "asc" }
      },
      feedbacks: {
        orderBy: { createdAt: "asc" }
      }
      },
      orderBy: { order: "asc" }
    });
  }

  return { columns, contract };
};

/**
 * Create a new column
 */
export const createColumn = async (contractId, milestoneId, name, color, userId) => {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId }
  });

  if (!contract || (contract.clientId !== userId && contract.freelancerId !== userId)) {
    throw new Error("Unauthorized or contract not found");
  }

  // Find max order for this milestone
  const lastColumn = await prisma.boardColumn.findFirst({
    where: { contractId, milestoneId },
    orderBy: { order: "desc" }
  });

  const nextOrder = (lastColumn?.order ?? -1) + 1;

  return await prisma.boardColumn.create({
    data: {
      contractId,
      milestoneId,
      name,
      color: color || "slate",
      order: nextOrder
    },
    include: { tasks: true }
  });
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
 * Create column client feedback
 */
export const addColumnFeedback = async (columnId, content, userId) => {
  const column = await prisma.boardColumn.findUnique({
    where: { id: columnId },
    include: { contract: true }
  });

  if (!column || column.contract.clientId !== userId) {
    throw new Error("Unauthorized: Only client can add column feedback");
  }

  return await prisma.columnFeedback.create({
    data: { 
      columnId,
      content 
    }
  });
};

/**
 * Create task client feedback
 */
export const addTaskFeedback = async (taskId, content, userId) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { contract: true }
  });

  if (!task || task.contract.clientId !== userId) {
    throw new Error("Unauthorized: Only client can add task feedback");
  }

  return await prisma.taskFeedback.create({
    data: { 
      taskId,
      content 
    }
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

  // Find max order in the column and its milestone
  const column = await prisma.boardColumn.findUnique({
    where: { id: columnId },
    include: {
      tasks: { orderBy: { order: "desc" }, take: 1 }
    }
  });

  if (!column) throw new Error("Column not found");

  const nextOrder = (column.tasks[0]?.order ?? -1) + 1;

  return await prisma.task.create({
    data: {
      contractId,
      columnId,
      milestoneId: column.milestoneId,
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

/**
 * Submit a milestone for review (Freelancer)
 */
export const submitMilestone = async (milestoneId, contractId, data, userId) => {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || contract.freelancerId !== userId) {
    throw new Error("Unauthorized");
  }

  return await prisma.milestone.update({
    where: { id: milestoneId, contractId },
    data: {
      status: "IN_REVIEW",
      freelancerNotes: data.notes || null,
      completedAt: new Date()
    }
  });
};

/**
 * Review and provide feedback for a milestone (Client)
 */
export const reviewMilestone = async (milestoneId, contractId, data, userId) => {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || contract.clientId !== userId) {
    throw new Error("Unauthorized");
  }

  const { status, feedback } = data;
  // Client can either send feedback (PENDING) or approve+pay (AWAITING_PAYMENT)
  if (!["AWAITING_PAYMENT", "PENDING"].includes(status)) {
    throw new Error("Invalid status. Use AWAITING_PAYMENT (Approve) or PENDING (Reject/Feedback).");
  }

  return await prisma.$transaction(async (tx) => {
    const updatedMilestone = await tx.milestone.update({
      where: { id: milestoneId, contractId },
      data: {
        status,
        clientFeedback: feedback || null,
        completedAt: status === "PENDING" ? null : undefined
      }
    });
    return updatedMilestone;
  });
};

/**
 * Confirm payment received (Freelancer) — moves AWAITING_PAYMENT → PAID
 */
export const confirmPayment = async (milestoneId, contractId, userId) => {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || contract.freelancerId !== userId) {
    throw new Error("Unauthorized: Only the freelancer can confirm payment receipt");
  }

  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId, contractId }
  });

  if (!milestone) throw new Error("Milestone not found");
  if (milestone.status !== "AWAITING_PAYMENT") {
    throw new Error("Milestone is not awaiting payment confirmation");
  }

  return await prisma.milestone.update({
    where: { id: milestoneId, contractId },
    data: {
      status: "PAID",
      completedAt: new Date()
    }
  });
};

/**
 * Move column to a new order
 */
export const moveColumn = async (columnId, newOrder, userId) => {
  return await prisma.$transaction(async (tx) => {
    const column = await tx.boardColumn.findUnique({
      where: { id: columnId },
      include: { contract: true }
    });

    if (!column || (column.contract.clientId !== userId && column.contract.freelancerId !== userId)) {
      throw new Error("Unauthorized or column not found");
    }

    const oldOrder = column.order;
    const milestoneId = column.milestoneId;
    const contractId = column.contractId;

    if (oldOrder === newOrder) return column;

    if (oldOrder < newOrder) {
      await tx.boardColumn.updateMany({
        where: { contractId, milestoneId, order: { gt: oldOrder, lte: newOrder } },
        data: { order: { decrement: 1 } }
      });
    } else {
      await tx.boardColumn.updateMany({
        where: { contractId, milestoneId, order: { gte: newOrder, lt: oldOrder } },
        data: { order: { increment: 1 } }
      });
    }

    return await tx.boardColumn.update({
      where: { id: columnId },
      data: { order: newOrder }
    });
  });
};

/**
 * Delete a column
 */
export const deleteColumn = async (columnId, userId) => {
  const column = await prisma.boardColumn.findUnique({
    where: { id: columnId },
    include: { contract: true }
  });

  if (!column || (column.contract.clientId !== userId && column.contract.freelancerId !== userId)) {
    throw new Error("Unauthorized or column not found");
  }

  // Delete tasks logically required if not cascaded by DB schema
  await prisma.task.deleteMany({
    where: { columnId }
  });

  return await prisma.boardColumn.delete({
    where: { id: columnId }
  });
};
