import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

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

const db = getFirestore();
const auth = getAuth();

// Define a comprehensive interface for student objects based on the provided structure
interface Student {
    id?: string;
    issues?: any[];
    parentsDetails?: any[];
    fullName: string;
    registrationNumber?: number;
    email: string;
    course: string;
    year?: string;
    dateOfOccupancy?: string;
    age?: number;
    phoneNumber?: number;
    hostelDetails?: {
        hostelId: string;
        room_id: string;
        roomNumber: string;
        floor: string;
    };
    profilePictureUrl?: string;
    uid?: string;
    department?: string;
}

export async function GET(request: NextRequest) {
    try {
        // Validate authentication
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized: Missing or invalid token" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await auth.verifyIdToken(token);
        const uid = decodedToken.uid;

        if (!uid) {
            return NextResponse.json({ error: "Unauthorized: Invalid user" }, { status: 401 });
        }

        // Get user role and assigned floors
        const userRecord = await auth.getUser(uid);
        const role = userRecord.customClaims?.role || decodedToken.role;
        const assignedFloors = userRecord.customClaims?.assignedFloors || [];

        // Check if user has appropriate role
        const allowedRoles = ["chief_warden", "hostel_warden", "floor_warden", "supervisor", "admin"];
        if (!allowedRoles.includes(role)) {
            return NextResponse.json({ 
                error: "Unauthorized: Insufficient permissions to access student data" 
            }, { status: 403 });
        }

        // If the user is a floor warden, ensure they have assigned floors
        if (role === "floor_warden" && assignedFloors.length === 0) {
            return NextResponse.json({ 
                error: "No assigned floors found for this floor warden" 
            }, { status: 403 });
        }

        // Get query parameters
        const url = new URL(request.url);
        const floorId = url.searchParams.get("floorId");
        const limit = parseInt(url.searchParams.get("limit") || "100");
        const page = parseInt(url.searchParams.get("page") || "1");

        console.log(`Fetching students: floorId=${floorId}, role=${role}, assignedFloors=${assignedFloors}`);

        // Build the query based on the filters
        let query: FirebaseFirestore.Query = db.collection("students");

        if (floorId) {
            // If a specific floorId is provided, ensure it is part of the assigned floors
            if (role === "floor_warden" && !assignedFloors.includes(floorId)) {
                return NextResponse.json({ 
                    error: "Unauthorized: You do not have access to this floor" 
                }, { status: 403 });
            }
            query = query.where("hostelDetails.floor", "==", floorId);
        } else if (role === "floor_warden") {
            // If no specific floorId is provided, fetch students for all assigned floors
            query = query.where("hostelDetails.floor", "in", assignedFloors);
        }

        // Apply pagination
        const startAt = (page - 1) * limit;
        const querySnapshot = await query.limit(limit).offset(startAt).get();

        // Format the response
        const students: Student[] = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            students.push({
                id: doc.id,
                ...data,
            } as Student);
        });

        // Get total count for pagination
        const totalSnapshot = await query.count().get();
        const total = totalSnapshot.data().count;

        return NextResponse.json({
            students,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching students:", error);
        return NextResponse.json({ 
            error: "Failed to fetch students",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
