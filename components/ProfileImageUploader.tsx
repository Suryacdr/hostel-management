"use client";

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Camera } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { compressImage } from '@/helper/super-compression';

interface ProfileImageUploaderProps {
  currentImageUrl: string;
  studentName: string;
  roomNumber?: string;
  onImageUploaded: (imageUrl: string) => void;
  className?: string;
}

const ProfileImageUploader: React.FC<ProfileImageUploaderProps> = ({
  currentImageUrl,
  studentName,
  roomNumber,
  onImageUploaded,
  className = ''
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image file selection
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Upload image
      await uploadImage(file);
    }
  };

  // Handle image upload
  const uploadImage = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadError(null);
      
      // Compress the image before uploading
      console.log("Compressing image...");
      const compressedFile = await compressImage(file, 800, 0.8);
      console.log(`Original size: ${(file.size / 1024).toFixed(2)}KB, Compressed size: ${(compressedFile.size / 1024).toFixed(2)}KB`);
      
      // Convert compressed file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(compressedFile);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });
      
      // Get authentication token
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not logged in");
      }
      
      const token = await user.getIdToken(true);
      
      // Call server-side endpoint
      const response = await fetch("/api/profileUpdate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageData: base64Data,
          studentName,
          roomNumber,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload image");
      }
      
      const data = await response.json();
      
      // Call the onImageUploaded callback with the new image URL
      onImageUploaded(data.profilePictureUrl);
      
      console.log("Image upload successful, new URL:", data.profilePictureUrl);
      
    } catch (error) {
      console.error("Error uploading image:", error);
      setUploadError(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };
  
  // Trigger file input click
  const handleChooseImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="w-24 h-24 rounded-full overflow-hidden mb-3 bg-gray-200 dark:bg-slate-800 relative">
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <div className="w-8 h-8 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <Image
          src={previewImage || currentImageUrl || "/boy.png"}
          alt="Profile"
          fill
          className="object-cover"
        />
      </div>
      
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleImageChange}
        className="hidden"
      />
      
      <button
        type="button"
        onClick={handleChooseImage}
        disabled={isUploading}
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 disabled:opacity-50"
      >
        <Camera size={16} />
        {isUploading ? "Uploading..." : "Change Photo"}
      </button>
      
      {uploadError && (
        <p className="mt-2 text-xs text-red-500">{uploadError}</p>
      )}
    </div>
  );
};

export default ProfileImageUploader;