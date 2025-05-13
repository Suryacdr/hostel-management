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

        // Get user role and check if floor warden
        const userRecord = await auth.getUser(uid);
        const role = userRecord.customClaims?.role || decodedToken.role;

        if (role !== "floor_warden") {
            return NextResponse.json({ 
                error: "Unauthorized: Only floor wardens can access this endpoint" 
            }, { status: 403 });
        }

        // Get floor warden's assigned floors
        let wardenSnapshot = await db.collection("floor_wardens").where("uid", "==", uid).get();

        if (wardenSnapshot.empty && userRecord.email) {
            wardenSnapshot = await db.collection("floor_wardens").where("email", "==", userRecord.email).get();
        }

        if (wardenSnapshot.empty) {
            return NextResponse.json({ error: "Floor warden data not found" }, { status: 404 });
        }

        const wardenDoc = wardenSnapshot.docs[0];
        const wardenData = wardenDoc.data();
        const assignedFloors = wardenData?.assignedFloors || [];

        if (assignedFloors.length === 0) {
            return NextResponse.json({ error: "No floors assigned to floor warden" }, { status: 404 });
        }

        // Query parameters
        const searchParams = new URL(request.url).searchParams;
        const status = searchParams.get("status"); // 'pending', 'solved', 'all'
        const type = searchParams.get("type");     // Optional: 'maintenance', 'complaint'
        const floorId = searchParams.get("floorId"); // Optional: specific floor ID

        // If floorId is specified, check if it's in assigned floors
        if (floorId && !assignedFloors.includes(floorId)) {
            return NextResponse.json({ 
                error: "Unauthorized: Floor not assigned to this warden" 
            }, { status: 403 });
        }

        // Use only specified floor or all assigned floors
        const floorsToQuery = floorId ? [floorId] : assignedFloors;

        // Collect all issues from all floors
        const allIssues = [];

        // Query all students (inefficient but works for smaller datasets)
        const studentsSnapshot = await db.collection("students").get();
        
        // We'll filter in memory based on floor values
        for (const studentDoc of studentsSnapshot.docs) {
            const studentData = studentDoc.data();
            const studentIssues = studentData.issues || [];
            
            if (!Array.isArray(studentIssues) || studentIssues.length === 0) {
                continue;
            }
            
            // Get student floor information - check all possible properties
            const studentFloor = 
                studentData.floorId || 
                studentData.floor || 
                studentData.hostelDetails?.floor ||
                "";
                
            // For each floor assigned to the warden, check if this student belongs to it
            const studentBelongsToWardenFloor = floorsToQuery.includes(studentFloor);
            
            // If student doesn't belong to warden's floor, skip
            if (!studentBelongsToWardenFloor) {
                continue;
            }

            // Apply filters
            let filteredIssues = studentIssues;
            
            // Filter by status if requested
            if (status === "pending") {
                filteredIssues = filteredIssues.filter((issue: any) => !issue.solved);
            } else if (status === "solved") {
                filteredIssues = filteredIssues.filter((issue: any) => issue.solved);
            }
            
            // Filter by type if requested
            if (type) {
                filteredIssues = filteredIssues.filter((issue: any) => 
                    issue.type?.toLowerCase() === type.toLowerCase()
                );
            }
            
            // Add student context to each issue
            const processedIssues = filteredIssues.map((issue: any) => {
                return {
                    ...issue,
                    studentName: studentData.fullName || studentData.name || "Unknown",
                    studentId: studentDoc.id,
                    hostel: issue.hostel || issue.hostelDetails?.hostel || studentData.hostel || studentData.hostelDetails?.hostel,
                    floor: issue.floor || issue.hostelDetails?.floor || studentData.floor || studentData.hostelDetails?.floor || studentFloor,
                    room: issue.room || issue.hostelDetails?.roomNumber || studentData.room,
                    timestamp: issue.timestamp || issue.date || new Date().toISOString(),
                    solved: issue.solved || issue.isSolved || false
                };
            });
            
            allIssues.push(...processedIssues);
        }
        
        allIssues.sort((a, b) => {
            const dateA = new Date(a.timestamp).getTime();
            const dateB = new Date(b.timestamp).getTime();
            return dateB - dateA;
        });

        return NextResponse.json({ issues: allIssues });
    } catch (error) {
        console.error("Error fetching floor issues:", error);
        return NextResponse.json({ 
            error: "Failed to fetch issues",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
