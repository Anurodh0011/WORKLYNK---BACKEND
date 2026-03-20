import * as freelancerService from "../services/freelancer.service.js";

export const listFreelancers = async (req, res) => {
  try {
    const filters = req.query;
    // Handle skills string to array if passed as query
    if (filters.skills && typeof filters.skills === 'string') {
      filters.skills = filters.skills.split(',');
    }

    const freelancers = await freelancerService.getFreelancers(filters);
    res.status(200).json({ success: true, data: freelancers });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
