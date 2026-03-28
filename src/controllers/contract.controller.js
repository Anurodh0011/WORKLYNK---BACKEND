import * as contractService from "../services/contract.service.js";

/**
 * Endpoint to accept an application and start a contract
 */
export const acceptApplication = async (req, res) => {
  try {
    const applicationId = req.params.applicationId;
    const clientId = req.user.id;

    const contract = await contractService.acceptApplication(applicationId, clientId);

    res.status(201).json({
      success: true,
      message: "Application accepted and contract initialized successfully",
      data: contract,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get contract details
 */
export const getContractDetails = async (req, res) => {
  try {
    const contractId = req.params.id;
    const userId = req.user.id;

    const contract = await contractService.getContractById(contractId, userId);

    res.status(200).json({ success: true, data: contract });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Get all user contracts
 */
export const getMyContracts = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const contracts = await contractService.getUserContracts(userId, role);

    res.status(200).json({ success: true, data: contracts });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Update contract terms (Drafting)
 */
export const updateContract = async (req, res) => {
  try {
    const contractId = req.params.id;
    const clientId = req.user.id;
    const updateData = req.body;

    const contract = await contractService.updateContract(contractId, clientId, updateData);

    res.status(200).json({
      success: true,
      message: "Contract updated successfully",
      data: contract,
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
};

/**
 * Send contract to freelancer
 */
export const sendContract = async (req, res) => {
  try {
    const contractId = req.params.id;
    const clientId = req.user.id;

    const contract = await contractService.sendContractToFreelancer(contractId, clientId);

    res.status(200).json({
      success: true,
      message: "Contract sent to freelancer successfully",
      data: contract,
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
};

/**
 * Freelancer response to contract offer
 */
export const respondToContract = async (req, res) => {
  try {
    const contractId = req.params.id;
    const freelancerId = req.user.id;
    const { action, remarks } = req.body;

    const contract = await contractService.respondToContract(contractId, freelancerId, action, remarks);

    res.status(200).json({
      success: true,
      message: `Contract ${action.toLowerCase()}ed successfully`,
      data: contract,
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
};
