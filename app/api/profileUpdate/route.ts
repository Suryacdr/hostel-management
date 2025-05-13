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
        const { imageData } = body;

        if (!imageData) {
            return NextResponse.json(
                { error: "Image data is required" },
                { status: 400 }
            );
        }

        try {
            // Generate folder path and public ID based on role
            const userRecord = await admin.auth().getUser(uid);
            const userName = userRecord.displayName?.replace(/\s+/g, '_').toLowerCase() || uid;
            const folderPath = `hms/profiles/${role}/${userName}`;

            // Upload image using our utility function
            const uploadResult = await uploadImageToCloudinary(
                imageData,
                folderPath,
                userName
            );

            const secureUrl = uploadResult.secure_url;

            // Use Firebase Admin to update Firestore
            try {
                const db = admin.firestore();
                let userCollection;

                // Determine the correct collection based on role
                switch (role) {
                    case 'chief_warden':
                        userCollection = 'chief_warden'; // Fixed: Changed from 'chief_wardens' to 'chief_warden'
                        break;
                    case 'supervisor':
                        userCollection = 'supervisors';
                        break;
                    case 'hostel_warden':
                        userCollection = 'hostel_wardens';
                        break;
                    case 'floor_warden':
                        userCollection = 'floor_wardens';
                        break;
                    case 'floor_attendant':
                        userCollection = 'floor_attendants';
                        break;
                    case 'student':
                        userCollection = 'students';
                        break;
                    default:
                        return NextResponse.json(
                            { error: "Invalid user role" },
                            { status: 400 }
                        );
                }

                // Find the user document
                let userSnapshot = await db.collection(userCollection).where("uid", "==", uid).get();

                if (userSnapshot.empty && userRecord.email) {
                    userSnapshot = await db.collection(userCollection).where("email", "==", userRecord.email).get();
                }

                if (userSnapshot.empty) {
                    console.error(`${role} not found with UID:`, uid);
                    return NextResponse.json(
                        { error: `${role} not found` },
                        { status: 404 }
                    );
                }

                // Get the user document ID
                const userDoc = userSnapshot.docs[0];
                const userId = userDoc.id;
                const userData = userDoc.data();

                // Prepare update data
                const updateData: { profilePictureUrl: string; uid?: string } = {
                    profilePictureUrl: secureUrl
                };

                // If UID is missing or mismatched, add it to the update
                if (!userData.uid || userData.uid !== uid) {
                    updateData.uid = uid;
                }

                // Update the document with the profile picture URL
                await db.collection(userCollection).doc(userId).update(updateData);

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