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
        const allowedRoles = ["chief_warden", "hostel_warden", "floor_warden", "supervisor"];
        if (!allowedRoles.includes(role)) {
            return NextResponse.json({ 
                error: "Unauthorized: Insufficient permissions to access room data" 
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

        // Build the query based on the filters
        let query: FirebaseFirestore.Query = db.collection("rooms");

        if (floorId) {
            // If a specific floorId is provided, ensure it is part of the assigned floors
            if (role === "floor_warden" && !assignedFloors.includes(floorId)) {
                return NextResponse.json({ 
                    error: "Unauthorized: You do not have access to this floor" 
                }, { status: 403 });
            }
            query = query.where("floorId", "==", floorId);
        } else if (role === "floor_warden") {
            // If no specific floorId is provided, fetch rooms for all assigned floors
            // Since we can't do a where-in query directly, we'll fetch all and filter
            const roomsSnapshot = await query.get();
            const rooms = roomsSnapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    photos: doc.data().photos || []
                }))
                .filter(room => assignedFloors.includes(room.floorId));

            return NextResponse.json({ rooms });
        }

        // Execute the query
        const roomsSnapshot = await query.get();
        const rooms = roomsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            photos: doc.data().photos || []
        }));

        return NextResponse.json({ rooms });
    } catch (error) {
        console.error("Error fetching room photos:", error);
        return NextResponse.json({ 
            error: "Failed to fetch room photos",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
