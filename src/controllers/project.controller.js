import * as projectService from "../services/project.service.js";
import { successResponse, errorResponse } from "../helpers/response.helper.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

/**
 * Create a new project or draft
 */
export async function createProject(req, res, next) {
  try {
    const { id: clientId } = req.user;
    const projectData = req.body;

    // Handle attachments if any (from multer)
    if (req.files && req.files.length > 0) {
      projectData.attachments = await Promise.all(
        req.files.map(async (file) => {
          const result = await uploadToCloudinary(file.path, "worklynk/attachments");
          return {
            name: file.originalname,
            url: result?.secure_url || `/uploads/${file.filename}`,
            type: file.mimetype,
          };
        })
      );
    }

    const project = await projectService.createProject(clientId, projectData);

    return successResponse(
      res,
      `Project ${project.status === 'DRAFT' ? 'saved as draft' : 'created successfully'}`,
      project,
      201
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Update an existing project
 */
export async function updateProject(req, res, next) {
  try {
    const { id: projectId } = req.params;
    const { id: clientId } = req.user;
    const updateData = req.body;

    // Handle attachments if any (from multer)
    if (req.files && req.files.length > 0) {
      const newAttachments = await Promise.all(
        req.files.map(async (file) => {
          const result = await uploadToCloudinary(file.path, "worklynk/attachments");
          return {
            name: file.originalname,
            url: result?.secure_url || `/uploads/${file.filename}`,
            type: file.mimetype,
          };
        })
      );
      
      // Fetch existing project to get current attachments
      const existingProject = await projectService.getProjectById(projectId);
      const existingAttachments = existingProject?.attachments || [];
      
      updateData.attachments = [...existingAttachments, ...newAttachments];
    }

    const project = await projectService.updateProject(projectId, clientId, updateData);

    return successResponse(res, "Project updated successfully", project);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, null, error.statusCode);
    }
    next(error);
  }
}

/**
 * Get all open projects for freelancers
 */
export async function getProjects(req, res, next) {
  try {
    const filters = req.query;
    const projects = await projectService.getProjects(filters);
    return successResponse(res, "Projects retrieved successfully", projects);
  } catch (error) {
    next(error);
  }
}

/**
 * Get details of a single project
 */
export async function getProjectById(req, res, next) {
  try {
    const { id: projectId } = req.params;
    const project = await projectService.getProjectById(projectId, req.user?.id);

    if (!project) {
      return errorResponse(res, "Project not found", null, 404);
    }

    return successResponse(res, "Project details retrieved successfully", project);
  } catch (error) {
    next(error);
  }
}

/**
 * Get projects created by the current client
 */
export async function getMyProjects(req, res, next) {
  try {
    const { id: clientId } = req.user;
    const projects = await projectService.getClientProjects(clientId);
    return successResponse(res, "My projects retrieved successfully", projects);
  } catch (error) {
    next(error);
  }
}
