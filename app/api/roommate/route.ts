import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import admin from "firebase-admin";

// Initialize Firebase Admin if it hasn't been initialized yet
if (!admin.apps.length) {
    try {
        const serviceAccount = require("@/serviceAccountKey.json");
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (error) {
        console.error("Firebase initialization error:", error);
    }
}

// Create proper db and auth instances
const db = getFirestore();
const auth = getAuth();

export async function GET(request: NextRequest) {
    try {
        // Verify authentication
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        // Use auth.verifyIdToken instead of verifyToken
        const decodedToken = await auth.verifyIdToken(token);

        if (!decodedToken) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // Get query parameters
        const searchParams = request.nextUrl.searchParams;
        const hostelId = searchParams.get("hostelId");
        const roomId = searchParams.get("roomId");
        const userId = searchParams.get("userId"); // Add userId to exclude current user

        if (!hostelId || !roomId) {
            return NextResponse.json(
                { error: "Missing required parameters" },
                { status: 400 }
            );
        }

        // Query students with the same room_id but exclude the current user
        let query = db
            .collection("students")
            .where("hostelDetails.hostelId", "==", hostelId)
            .where("hostelDetails.room_id", "==", roomId);

        const studentsSnapshot = await query.get();

        if (studentsSnapshot.empty) {
            return NextResponse.json({ students: [] });
        }

        // Map student documents to objects and filter out current user
        const students = studentsSnapshot.docs
            .map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    fullName: data.fullName || "",
                    email: data.email || "",
                    course: data.course || "",
                    registrationNumber: data.registrationNumber || "",
                    year: data.year || "",
                    dateOfOccupancy: data.dateOfOccupancy || "",
                    pictureProfileUrl: data.pictureProfileUrl || data.profilePictureUrl || "",
                    profilePictureUrl: data.profilePictureUrl || data.pictureProfileUrl || "",
                    phoneNumber: data.phoneNumber || "",
                    hostelDetails: data.hostelDetails || {},
                };
            })
            .filter(student => !userId || student.id !== userId); // Filter out current user

        return NextResponse.json({ students });
    } catch (error) {
        console.error("Error in roommate API:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}