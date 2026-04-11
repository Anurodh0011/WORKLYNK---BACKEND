import prisma from "../prisma/client.js";

/**
 * Log an administrative activity
 * @param {Object} params
 * @param {string} params.adminId - ID of the admin performing the action
 * @param {string} params.event - Description of the event
 * @param {string} [params.targetId] - ID of the target object (user, project, etc)
 * @param {string} [params.targetType] - Type of the target object
 * @param {Object} [params.details] - Additional JSON data
 * @param {string} [params.deviceInfo] - Device name/browser string
 * @param {string} [params.ipAddress] - IP address of the request
 * @param {string} [params.location] - Geographical location
 * @param {string} [params.status] - Status (INFO, SUCCESS, WARNING, ALERT, CRITICAL)
 */
export const logActivity = async ({
  adminId,
  event,
  targetId,
  targetType,
  details,
  deviceInfo,
  ipAddress,
  location,
  status = "INFO"
}) => {
  try {
    await prisma.activityLog.create({
      data: {
        adminId,
        event,
        targetId,
        targetType,
        details,
        deviceInfo,
        ipAddress,
        location,
        status,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};
