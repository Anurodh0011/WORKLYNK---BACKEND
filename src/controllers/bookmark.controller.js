import * as bookmarkService from "../services/bookmark.service.js";

export const toggleProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const projectId = req.params.projectId;
    const result = await bookmarkService.toggleProjectBookmark(userId, projectId);
    
    res.status(200).json({
      success: true,
      message: result.bookmarked ? "Project bookmarked" : "Project removed from bookmarks",
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const toggleFreelancer = async (req, res) => {
  try {
    const clientId = req.user.id;
    const freelancerId = req.params.freelancerId;
    const result = await bookmarkService.toggleFreelancerBookmark(clientId, freelancerId);
    
    res.status(200).json({
      success: true,
      message: result.bookmarked ? "Freelancer saved" : "Freelancer removed from saved list",
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getSavedProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const saved = await bookmarkService.getSavedProjects(userId);
    res.status(200).json({ success: true, data: saved });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getSavedFreelancers = async (req, res) => {
  try {
    const clientId = req.user.id;
    const saved = await bookmarkService.getSavedFreelancers(clientId);
    res.status(200).json({ success: true, data: saved });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
