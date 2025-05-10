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

// Define a proper interface for student objects
interface Student {
  id: string;
  name: string;
  email: string;
  course?: string;
  department?: string;
  room?: string;
  hostel?: string;
  floorId?: string;
  floor?: string;
  profilePictureUrl?: string;
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

        // Get user role
        const userRecord = await auth.getUser(uid);
        const role = userRecord.customClaims?.role || decodedToken.role;

        // Check if user has appropriate role
        const allowedRoles = ["chief_warden", "hostel_warden", "floor_warden", "supervisor"];
        if (!allowedRoles.includes(role)) {
            return NextResponse.json({ 
                error: "Unauthorized: Insufficient permissions to access student data" 
            }, { status: 403 });
        }

        // Get query parameters
        const url = new URL(request.url);
        const floorIds = url.searchParams.get("floorIds")?.split(",") || [];
        const hostelId = url.searchParams.get("hostelId");

        console.log(`Fetching students for ${role}. FloorIds: ${floorIds.join(", ")}, HostelId: ${hostelId}`);

        // Prepare query based on parameters
        let students: Student[] = [];

        if (floorIds.length > 0) {
            // For each floor ID, try different field formats to find students assigned to that floor
            for (const floorId of floorIds) {
                // Query by floorId field
                const byFloorIdSnapshot = await db.collection("students")
                    .where("floorId", "==", floorId).get();
                
                // Query by floor field 
                const byFloorSnapshot = await db.collection("students")
                    .where("floor", "==", floorId).get();
                
                // Query by hostelDetails.floor field
                const byHostelDetailsSnapshot = await db.collection("students")
                    .where("hostelDetails.floor", "==", floorId).get();
                
                // Combine results, avoiding duplicates
                const allStudentDocs = [
                    ...byFloorIdSnapshot.docs, 
                    ...byFloorSnapshot.docs,
                    ...byHostelDetailsSnapshot.docs
                ];
                
                // Use a map to avoid duplicates based on student ID
                const uniqueStudents = new Map();
                for (const doc of allStudentDocs) {
                    if (!uniqueStudents.has(doc.id)) {
                        const data = doc.data();
                        uniqueStudents.set(doc.id, {
                            id: doc.id,
                            name: data.fullName || data.name || "Unknown Student",
                            email: data.email || "",
                            course: data.course || "",
                            department: data.department || "",
                            room: data.hostelDetails?.roomNumber || data.room || "",
                            hostel: data.hostelDetails?.hostel || data.hostel || "",
                            floorId: data.floorId || data.hostelDetails?.floor || floorId,
                            floor: data.floor || data.hostelDetails?.floor || floorId,
                            profilePictureUrl: data.profilePictureUrl || ""
                        });
                    }
                }
                
                // Add to our results array
                students = [...students, ...Array.from(uniqueStudents.values())];
            }
        } 
        else if (hostelId) {
            // If hostelId is provided, fetch students by hostel
            const byHostelSnapshot = await db.collection("students")
                .where("hostelDetails.hostel", "==", hostelId).get();
                
            const byHostelDirectSnapshot = await db.collection("students")
                .where("hostel", "==", hostelId).get();
                
            // Combine results, avoiding duplicates
            const allStudentDocs = [...byHostelSnapshot.docs, ...byHostelDirectSnapshot.docs];
            
            // Use a map to avoid duplicates based on student ID
            const uniqueStudents = new Map();
            for (const doc of allStudentDocs) {
                if (!uniqueStudents.has(doc.id)) {
                    const data = doc.data();
                    uniqueStudents.set(doc.id, {
                        id: doc.id,
                        name: data.fullName || data.name || "Unknown Student",
                        email: data.email || "",
                        course: data.course || "",
                        department: data.department || "",
                        room: data.hostelDetails?.roomNumber || data.room || "",
                        hostel: data.hostelDetails?.hostel || data.hostel || "",
                        floorId: data.floorId || data.hostelDetails?.floor || "",
                        floor: data.floor || data.hostelDetails?.floor || "",
                        profilePictureUrl: data.profilePictureUrl || ""
                    });
                }
            }
            
            students = Array.from(uniqueStudents.values());
        }
        else {
            // If no specific filters are provided, return empty result for security
            return NextResponse.json({ 
                error: "Missing required parameter: either floorIds or hostelId must be provided" 
            }, { status: 400 });
        }

        return NextResponse.json({ students });
    } catch (error) {
        console.error("Error fetching students:", error);
        return NextResponse.json({ 
            error: "Failed to fetch students",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
