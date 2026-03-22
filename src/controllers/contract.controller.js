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
