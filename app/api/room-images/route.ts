import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";
import path from "path";
import { readFileSync } from "fs";

// Initialize Firebase Admin if it hasn't been initialized yet
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

export async function GET(request: NextRequest) {
  try {
    // Get roomId from the query parameters
    const url = new URL(request.url);
    const roomId = url.searchParams.get("roomId");
    
    if (!roomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }
    
    // Verify authentication token from request headers
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "Authentication token is required" },
        { status: 401 }
      );
    }

    // Verify token using Firebase Admin
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (firebaseError) {
      console.error("Token verification error:", firebaseError);
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    // Get user ID and role from the decoded token
    const uid = decodedToken.uid;
    const role = decodedToken.role || decodedToken.customClaims?.role;

    if (!role) {
      return NextResponse.json(
        { error: "User role not found" },
        { status: 400 }
      );
    }

    try {
      const db = admin.firestore();
      let roomImages: string[] = [];
      
      // First try to get images from the room document
      const roomDoc = await db.collection('rooms').doc(roomId).get();
      
      if (roomDoc.exists) {
        const roomData = roomDoc.data();
        if (roomData && roomData.imageUrls && Array.isArray(roomData.imageUrls)) {
          roomImages = roomData.imageUrls;
        }
      }
      
      // If no room images found and user is a student, check student's roomBucket
      if (roomImages.length === 0 && role === 'student') {
        const studentSnapshot = await db.collection('students').where("uid", "==", uid).get();
        
        if (!studentSnapshot.empty) {
          const studentDoc = studentSnapshot.docs[0];
          const studentData = studentDoc.data();
          
          if (studentData && studentData.roomBucket && Array.isArray(studentData.roomBucket)) {
            roomImages = studentData.roomBucket;
          }
        }
      }

      return NextResponse.json({
        images: roomImages
      });
    } catch (error) {
      console.error("Error fetching room images:", error);
      return NextResponse.json(
        { error: "Failed to fetch room images", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
