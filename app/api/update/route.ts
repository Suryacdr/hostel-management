import { NextResponse } from "next/server";
import admin from "firebase-admin";

// Initialize Firebase Admin if it hasn't been initialized yet
if (!admin.apps.length) {
    try {
        const serviceAccount = require("../../../serviceAccountKey.json");
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (error) {
        console.error("Firebase initialization error:", error);
    }
}

export async function POST(request: Request) {
  try {
    // Extract the authorization token from the request headers
    const authHeader = request.headers.get("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
    }
    
    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    try {
      // Verify the Firebase token
      const decodedToken = await admin.auth().verifyIdToken(token);
      if (!decodedToken || !decodedToken.uid) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
      
      const uid = decodedToken.uid;
      
      // Get the user record to access email
      const userRecord = await admin.auth().getUser(uid);
      
      // Get the update data from the request body
      const data = await request.json();
      
      // Validate the data
      if (!data) {
        return NextResponse.json({ error: "No data provided" }, { status: 400 });
      }

      // Only update fields that are provided
      const updateData: Record<string, any> = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.profilePictureUrl !== undefined) updateData.profilePictureUrl = data.profilePictureUrl;
      
      // Skip if no fields to update
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ 
          success: false, 
          message: "No valid fields to update"
        });
      }

      console.log(`Attempting to update user with UID ${uid}`);

      // Update the user data in Firestore using admin SDK
      const adminDb = admin.firestore();
      
      // Use the same approach as in fetch API to find the student document
      // First try to find by UID
      let studentSnapshot = await adminDb.collection("students").where("uid", "==", uid).get();
      
      // If not found by UID, try by email
      if (studentSnapshot.empty && userRecord.email) {
        console.log(`Student not found by UID, trying email: ${userRecord.email}`);
        studentSnapshot = await adminDb.collection("students").where("email", "==", userRecord.email).get();
      }
      
      // If still empty, return error
      if (studentSnapshot.empty) {
        console.error(`Student document not found for UID ${uid} or email ${userRecord.email}`);
        return NextResponse.json({ 
          error: "Student document not found in database. Please contact support." 
        }, { status: 404 });
      }
      
      // Get the student document
      const studentDoc = studentSnapshot.docs[0];
      const studentId = studentDoc.id;
      
      console.log(`Found student document with ID: ${studentId}`);
      console.log(`Updating with data:`, updateData);
      
      // If document exists, update it
      await adminDb.collection("students").doc(studentId).update({
        ...(data.name && { fullName: data.name }),
        ...(data.email && { email: data.email }),
        ...(data.profilePictureUrl && { profilePictureUrl: data.profilePictureUrl }),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Updated student ${studentId} successfully`);

      // If email is updated, also update it in Firebase Auth
      if (data.email) {
        await admin.auth().updateUser(uid, {
          email: data.email
        });
      }

      return NextResponse.json({ 
        success: true, 
        message: "Profile updated successfully",
        updatedFields: Object.keys(updateData)
      });
    } catch (verifyError: any) {
      console.error("Token verification error:", verifyError);
      return NextResponse.json({ 
        error: verifyError.message || "Failed to verify token",
        code: verifyError.code
      }, { status: 401 });
    }
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ 
      error: error.message || "Internal server error",
      code: error.code
    }, { status: 500 });
  }
}