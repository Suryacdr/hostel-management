import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";
import path from "path";
import { readFileSync } from "fs";
import { uploadImageToCloudinary, getStudentImagePath } from "@/util/cloudinary";

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

        // Get user ID from the decoded token
        const uid = decodedToken.uid;

        // Get request body
        const body = await request.json();
        const { imageData, studentName, roomNumber } = body;

        if (!imageData) {
            return NextResponse.json(
                { error: "Image data is required" },
                { status: 400 }
            );
        }

        console.log("Processing image upload for user:", uid);
        console.log("Student name:", studentName);
        console.log("Room number:", roomNumber);

        try {
            // Generate folder path and public ID
            const folderPath = getStudentImagePath(roomNumber, studentName);
            const publicId = studentName.replace(/\s+/g, '_').toLowerCase();

            console.log("Uploading to Cloudinary folder:", folderPath);

            // Upload image using our utility function
            const uploadResult = await uploadImageToCloudinary(
                imageData,
                folderPath,
                publicId
            );

            console.log("Cloudinary upload successful");

            // Get the secure URL from the Cloudinary response
            const secureUrl = uploadResult.secure_url;
            console.log("Image URL:", secureUrl);

            // Use Firebase Admin to update Firestore
            try {
                const db = admin.firestore();

                // Find the student document by UID
                let studentSnapshot = await db.collection("students").where("uid", "==", uid).get();

                const userRecord = await admin.auth().getUser(uid);
                if (studentSnapshot.empty && userRecord.email) {
                    studentSnapshot = await db.collection("students").where("email", "==", userRecord.email).get();
                }

                if (studentSnapshot.empty) {
                    console.error("Student not found with UID:", uid);
                    return NextResponse.json(
                        { error: "Student not found" },
                        { status: 404 }
                    );
                }

                // Get the student document ID
                const studentDoc = studentSnapshot.docs[0];
                const studentId = studentDoc.id;

                // Update the student document with the profile picture URL
                await db.collection("students").doc(studentId).update({
                    profilePictureUrl: secureUrl
                });

                console.log("Profile updated in Firestore successfully using Admin SDK for student ID:", studentId);

                // Return success response
                return NextResponse.json({
                    success: true,
                    profilePictureUrl: secureUrl
                });
            } catch (firestoreError) {
                console.error("Firestore update error:", firestoreError);
                return NextResponse.json(
                    { error: "Failed to update profile in database", details: firestoreError instanceof Error ? firestoreError.message : "Unknown error" },
                    { status: 500 }
                );
            }
        } catch (cloudinaryError) {
            console.error("Cloudinary upload error:", cloudinaryError);
            return NextResponse.json(
                { error: "Failed to upload image to Cloudinary", details: cloudinaryError instanceof Error ? cloudinaryError.message : "Unknown error" },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("Profile update error:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}