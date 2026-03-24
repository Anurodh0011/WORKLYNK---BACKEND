import * as kanbanService from "../services/kanban.service.js";

export const getBoardData = async (req, res) => {
  try {
    const contractId = req.params.contractId;
    const userId = req.user.id;
    const milestoneId = req.query.milestoneId;
    const board = await kanbanService.getBoardData(contractId, userId, milestoneId);
    res.status(200).json({ success: true, data: board });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createColumn = async (req, res) => {
  try {
    const { contractId, milestoneId, name, color } = req.body;
    const userId = req.user.id;
    const column = await kanbanService.createColumn(contractId, milestoneId, name, color, userId);
    res.status(201).json({ success: true, data: column });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createTask = async (req, res) => {
  try {
    const { contractId, columnId, title, description } = req.body;
    const userId = req.user.id;
    const task = await kanbanService.createTask(contractId, columnId, { title, description }, userId);
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const moveTask = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const { targetColumnId, newOrder } = req.body;
    const userId = req.user.id;
    const task = await kanbanService.moveTask(taskId, targetColumnId, newOrder, userId);
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const renameColumn = async (req, res) => {
  try {
    const columnId = req.params.columnId;
    const { name } = req.body;
    const userId = req.user.id;
    const column = await kanbanService.renameColumn(columnId, name, userId);
    res.status(200).json({ success: true, data: column });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const submitMilestone = async (req, res) => {
  try {
    const { milestoneId, contractId } = req.params;
    const userId = req.user.id;
    const milestone = await kanbanService.submitMilestone(milestoneId, contractId, req.body, userId);
    res.status(200).json({ success: true, data: milestone });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const reviewMilestone = async (req, res) => {
  try {
    const { milestoneId, contractId } = req.params;
    const userId = req.user.id;
    const milestone = await kanbanService.reviewMilestone(milestoneId, contractId, req.body, userId);
    res.status(200).json({ success: true, data: milestone });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
