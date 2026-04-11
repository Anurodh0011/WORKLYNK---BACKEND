import cloudinary from "../config/cloudinaryConfig.js";
import fs from "fs";

/**
 * Upload a file to Cloudinary
 * @param {string} localFilePath Path to the local file
 * @param {string} folder Folder name in Cloudinary
 * @returns {Promise<object>} Upload result
 */
export const uploadToCloudinary = async (localFilePath, folder = "worklynk") => {
  try {
    if (!localFilePath) return null;

    // Upload the file to cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: folder,
    });

    // File has been uploaded successfully
    console.log("File is uploaded on cloudinary", response.url);
    
    // Remove the locally saved temporary file
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return response;
  } catch (error) {
    // Remove the locally saved temporary file as the upload operation failed
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    console.error("Cloudinary upload error:", error);
    return null;
  }
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId Public ID of the file in Cloudinary
 * @returns {Promise<object>} Delete result
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;
    const response = await cloudinary.uploader.destroy(publicId);
    return response;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return null;
  }
};
