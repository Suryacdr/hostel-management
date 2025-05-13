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

export async function POST(request: NextRequest) {
  try {
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

    // Get request body
    const body = await request.json();
    const { roomId, images } = body;

    if (!roomId || !images || !Array.isArray(images)) {
      return NextResponse.json(
        { error: "Room ID and image array are required" },
        { status: 400 }
      );
    }

    try {
      const db = admin.firestore();

      // Update student's roomBucket field
      if (role === 'student') {
        // Find the student document
        const studentSnapshot = await db.collection('students').where("uid", "==", uid).get();
        if (studentSnapshot.empty) {
          return NextResponse.json(
            { error: "Student not found" },
            { status: 404 }
          );
        }

        // Update the student document
        const studentDoc = studentSnapshot.docs[0];
        await db.collection('students').doc(studentDoc.id).update({
          roomBucket: images
        });
      }

      // Update the room document if it exists
      try {
        const roomDoc = await db.collection('rooms').doc(roomId).get();
        if (roomDoc.exists) {
          await db.collection('rooms').doc(roomId).update({
            imageUrls: images,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: uid
          });
        }
      } catch (roomError) {
        console.warn("Could not update room document:", roomError);
        // Continue even if room update fails
      }

      return NextResponse.json({
        success: true,
        message: "Room images updated successfully"
      });
    } catch (error) {
      console.error("Error updating room images:", error);
      return NextResponse.json(
        { error: "Failed to update room images", details: error instanceof Error ? error.message : "Unknown error" },
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
