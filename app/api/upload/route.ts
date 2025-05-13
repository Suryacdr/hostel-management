import { NextRequest, NextResponse } from "next/server";
import { auth, firestore } from "firebase-admin";
import { uploadImageToCloudinary } from "@/util/cloudinary";
import * as admin from "firebase-admin";
import path from "path";
import { readFileSync } from "fs";
import { v2 as cloudinary } from 'cloudinary';

if (!admin.apps.length) {
  try {
    // Get the service account credentials
    const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
}

// Ensure Cloudinary is configured for server-side API routes
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(request: NextRequest) {
  try {
    
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await auth().verifyIdToken(token);
    } catch (error) {
      console.error("Invalid token:", error);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Parse the multipart form data
    const formData = await request.formData();
    
    // Extract file and metadata
    const imageFile = formData.get("image") as File;
    const roomId = formData.get("roomId") as string;
    const hostelId = formData.get("hostelId") as string;
    const floorNumber = formData.get("floorNumber") as string;
    
    if (!imageFile || !roomId || !hostelId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check file type
    if (!imageFile.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    try {
      // Convert file to base64 for Cloudinary upload
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = buffer.toString('base64');
      const dataUri = `data:${imageFile.type};base64,${base64Image}`;
      
      // Structure the folder path for Cloudinary
      const folderPath = `hms/rooms/${hostelId}/${floorNumber}/${roomId}`;
      const fileName = `room_${Date.now()}`;
      
      console.log("Uploading to Cloudinary folder:", folderPath);

      // Upload image to Cloudinary using the utility function
      const uploadResult = await uploadImageToCloudinary(
        dataUri,
        folderPath,
        fileName
      );

      console.log("Cloudinary upload successful");
      const imageUrl = uploadResult.secure_url;
      console.log("Image URL:", imageUrl);

      // Update Firestore document with new image reference
      const db = firestore();
      const roomRef = db.collection('rooms').doc(roomId);
      
      // Get current room data
      const roomDoc = await roomRef.get();
      if (roomDoc.exists) {
        const roomData = roomDoc.data();
        const images = roomData?.images || [];
        
        // Add new image URL if not already present
        if (!images.includes(imageUrl)) {
          await roomRef.update({
            images: [...images, imageUrl],
            updatedAt: firestore.FieldValue.serverTimestamp()
          });
        }
      } else {
        // Create the room document if it doesn't exist
        await roomRef.set({
          roomId,
          hostelId,
          floorNumber,
          images: [imageUrl],
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp()
        });
      }

      // Also update the student's profile with the room image
      try {
        const studentsSnapshot = await db.collection('students')
          .where("hostelDetails.room_id", "==", roomId)
          .get();

        if (!studentsSnapshot.empty) {
          const batch = db.batch();
          
          studentsSnapshot.forEach(doc => {
            const studentData = doc.data();
            const roomBucket = studentData.roomBucket || [];
            
            if (!roomBucket.includes(imageUrl)) {
              batch.update(doc.ref, {
                roomBucket: [...roomBucket, imageUrl]
              });
            }
          });
          
          await batch.commit();
          console.log(`Updated ${studentsSnapshot.size} student records with room image`);
        }
      } catch (studentUpdateError) {
        console.error("Error updating student records:", studentUpdateError);
        // Continue execution - this is not a critical failure
      }

      return NextResponse.json({ 
        success: true, 
        imageUrl,
        message: "Image uploaded successfully" 
      });
    } catch (uploadError) {
      console.error("Cloudinary upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload image to Cloudinary", details: uploadError instanceof Error ? uploadError.message : "Unknown error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image: " + (error as Error).message },
      { status: 500 }
    );
  }
}
