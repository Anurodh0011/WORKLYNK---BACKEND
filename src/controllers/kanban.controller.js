import * as kanbanService from "../services/kanban.service.js";

export const getBoardData = async (req, res) => {
  try {
    const contractId = req.params.contractId;
    const userId = req.user.id;
    const board = await kanbanService.getBoardData(contractId, userId);
    res.status(200).json({ success: true, data: board });
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
