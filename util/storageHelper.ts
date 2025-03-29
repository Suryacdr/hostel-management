import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "firebase/storage";
import { getAuth, onAuthStateChanged } from "firebase/auth";

/**
 * Checks if the current user has permission to edit images
 * @returns {Promise<boolean>} Whether the user can edit images
 */
export const canEditImages = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        user.getIdTokenResult().then((idTokenResult) => {
          resolve(idTokenResult.claims.canEditStorage === true);
        });
      } else {
        resolve(false);
      }
    });
  });
};

/**
 * Gets the path to a specific room's images
 * @param {string} hostelId - Hostel ID
 * @param {string} floorId - Floor ID
 * @param {string} roomId - Room ID
 * @returns {string} The storage path
 */
export const getRoomImagePath = (hostelId: string, floorId: string, roomId: string): string => {
  return `hostels/${hostelId}/floors/${floorId}/rooms/${roomId}/images/`;
};

/**
 * Gets room images for display
 * @param {string} hostelId - Hostel ID
 * @param {string} floorId - Floor ID
 * @param {string} roomId - Room ID 
 * @returns {Promise<string[]>} Array of image URLs
 */
export const getRoomImages = async (
  hostelId: string,
  floorId: string,
  roomId: string
): Promise<string[]> => {
  try {
    const storage = getStorage();
    const roomImagesPath = getRoomImagePath(hostelId, floorId, roomId);
    const imagesRef = ref(storage, roomImagesPath);
    
    const result = await listAll(imagesRef);
    const urls = await Promise.all(
      result.items
        .filter(item => !item.name.endsWith('.placeholder'))
        .map(async (item) => {
          return await getDownloadURL(item);
        })
    );
    
    return urls;
  } catch (error) {
    console.error("Error getting room images:", error);
    return [];
  }
};

/**
 * Uploads an image to a room
 * @param {string} hostelId - Hostel ID
 * @param {string} floorId - Floor ID
 * @param {string} roomId - Room ID
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} The download URL of the uploaded image
 */
export const uploadRoomImage = async (
  hostelId: string,
  floorId: string,
  roomId: string,
  file: File
): Promise<string> => {
  try {
    const hasEditPermission = await canEditImages();
    if (!hasEditPermission) {
      throw new Error("You don't have permission to upload images");
    }
    
    const storage = getStorage();
    const roomImagesPath = getRoomImagePath(hostelId, floorId, roomId);
    const fileName = `${Date.now()}_${file.name}`;
    const imageRef = ref(storage, roomImagesPath + fileName);
    
    await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(imageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading room image:", error);
    throw error;
  }
};

/**
 * Deletes a room image
 * @param {string} imageUrl - The URL of the image to delete
 * @returns {Promise<void>}
 */
export const deleteRoomImage = async (imageUrl: string): Promise<void> => {
  try {
    const hasEditPermission = await canEditImages();
    if (!hasEditPermission) {
      throw new Error("You don't have permission to delete images");
    }
    
    const storage = getStorage();
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error) {
    console.error("Error deleting room image:", error);
    throw error;
  }
};
