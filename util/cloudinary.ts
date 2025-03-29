// Helper functions for managing Cloudinary uploads
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload an image to Cloudinary
 * @param imageData Base64 encoded image data
 * @param folderPath Path to the folder to upload to
 * @param publicId Public ID for the image
 * @returns Promise resolving to the Cloudinary upload result
 */
export const uploadImageToCloudinary = (
  imageData: string,
  folderPath: string,
  publicId: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Make sure we're passing a proper object for options
    const uploadOptions = {
      folder: folderPath,
      public_id: publicId,
      overwrite: true,
    };
    
    // Verify we have valid imageData
    if (!imageData || typeof imageData !== 'string') {
      return reject(new Error("Invalid image data provided"));
    }
    
    console.log("Uploading to Cloudinary with options:", JSON.stringify(uploadOptions));
    
    cloudinary.uploader.upload(
      imageData,
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error details:", error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });
};

/**
 * Generate a folder path for a student's profile image
 * @param roomNumber Student's room number
 * @param studentName Student's name
 * @returns Formatted folder path
 */
export const getStudentImagePath = (
  roomNumber: string | undefined,
  studentName: string
): string => {
  // Make sure the path is properly formatted (no leading slash for Cloudinary folders)
  return `hms/students/${roomNumber || 'unassigned'}/${studentName.replace(/\s+/g, '_').toLowerCase()}`;
};