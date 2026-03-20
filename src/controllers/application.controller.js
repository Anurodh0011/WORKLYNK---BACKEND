import * as applicationService from "../services/application.service.js";
import { validationResult } from "express-validator";

export const apply = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const projectId = req.params.projectId;
    const freelancerId = req.user.id;
    
    // Format attachments from multer
    const attachments = req.files ? req.files.map(file => ({
        name: file.originalname,
        path: file.path,
        type: file.mimetype
    })) : [];

    const application = await applicationService.applyForProject(projectId, freelancerId, {
      ...req.body,
      attachments
    });

    const isDraft = application.status === "DRAFT";

    res.status(201).json({
      success: true,
      message: isDraft ? "Application saved as draft" : "Application submitted successfully",
      data: application,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getProjectApplications = async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const clientId = req.user.id;
    const applications = await applicationService.getProjectApplications(projectId, clientId);
    
    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getMyApplications = async (req, res) => {
  try {
    const freelancerId = req.user.id;
    const applications = await applicationService.getUserApplications(freelancerId);
    
    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const applicationId = req.params.id;
    const userId = req.user.id;
    const role = req.user.role;
    const { status } = req.body;

    const application = await applicationService.updateApplicationStatus(applicationId, userId, role, status);
    
    res.status(200).json({
      success: true,
      message: `Application ${status.toLowerCase()} successfully`,
      data: application,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
