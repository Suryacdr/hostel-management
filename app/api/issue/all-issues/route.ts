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

        // Get user role
        const userRecord = await auth.getUser(uid);
        const role = userRecord.customClaims?.role || decodedToken.role;

        console.log(`Fetching issues for user ${uid} with role ${role || 'unknown'}`);

        // Query parameters
        const searchParams = new URL(request.url).searchParams;
        const status = searchParams.get("status"); // 'pending', 'solved', 'all'
        const type = searchParams.get("type");     // Optional: 'maintenance', 'complaint'

        // Different queries based on user role
        let maintenanceIssues: any[] = [];

        if (role === "student") {
            // Students can only see their own issues
            let studentSnapshot = await db.collection("students").where("uid", "==", uid).get();
            
            if (studentSnapshot.empty && userRecord.email) {
                studentSnapshot = await db.collection("students").where("email", "==", userRecord.email).get();
            }

            if (!studentSnapshot.empty) {
                const studentData = studentSnapshot.docs[0].data();
                const issues = studentData.issues || [];
                
                if (Array.isArray(issues)) {
                    // Filter based on status if provided
                    let filteredIssues = issues;
                    if (status === "pending") {
                        filteredIssues = issues.filter((issue: any) => !issue.solved);
                    } else if (status === "solved") {
                        filteredIssues = issues.filter((issue: any) => issue.solved);
                    }
                    
                    // Filter by type if requested
                    if (type) {
                        filteredIssues = filteredIssues.filter((issue: any) => 
                            issue.type?.toLowerCase() === type.toLowerCase()
                        );
                    }
                    
                    // Process each issue
                    maintenanceIssues = filteredIssues.map((issue: any) => {
                        // Make sure each issue has all required fields
                        return {
                            ...issue,
                            studentName: studentData.fullName || studentData.name || "Unknown",
                            studentId: studentSnapshot.docs[0].id,
                            timestamp: issue.timestamp || new Date().toISOString(),
                            solved: issue.solved || issue.isSolved || false,
                            status: issue.status || (issue.solved ? "resolved" : "open"),
                            completeDate: issue.completeDate || null,
                        };
                    });
                }
            }
        } else if (["supervisor", "hostel_warden", "floor_warden", "floor_attendant", "chief_warden"].includes(role || "")) {
            // Staff roles can see issues based on their scope
            let assignedEntity: string | null = null;
            
            // Get assigned entity based on role
            if (role !== "chief_warden") {
                const staffCollectionMap: Record<string, string> = {
                    "supervisor": "supervisors",
                    "hostel_warden": "hostel_wardens",
                    "floor_warden": "floor_wardens",
                    "floor_attendant": "floor_attendants"
                };
                
                const staffCollection = staffCollectionMap[role || ""];
                if (staffCollection) {
                    let staffSnapshot = await db.collection(staffCollection).where("uid", "==", uid).get();
                    
                    if (staffSnapshot.empty && userRecord.email) {
                        staffSnapshot = await db.collection(staffCollection).where("email", "==", userRecord.email).get();
                    }
                    
                    if (!staffSnapshot.empty) {
                        const staffData = staffSnapshot.docs[0].data();
                        
                        // Get assigned entity (hostel or floor)
                        if (role === "supervisor" || role === "hostel_warden") {
                            assignedEntity = staffData.assignedHostel;
                        } else if (role === "floor_warden" || role === "floor_attendant") {
                            // For floor staff, we'll use the first assigned floor
                            assignedEntity = staffData.assignedFloors?.[0] || null;
                        }
                    }
                }
            }
            
            // Get all students
            const studentsSnapshot = await db.collection("students").get();
            
            // Collect all issues
            for (const studentDoc of studentsSnapshot.docs) {
                const studentData = studentDoc.data();
                const studentIssues = studentData.issues || [];
                
                if (!Array.isArray(studentIssues) || studentIssues.length === 0) {
                    continue;
                }
                
                // Filter issues based on role and assigned entity
                let relevantIssues = studentIssues;
                
                if (role !== "chief_warden" && assignedEntity) {
                    if (role === "supervisor" || role === "hostel_warden") {
                        // Filter by hostel
                        relevantIssues = studentIssues.filter((issue: any) => {
                            const issueHostel = issue.hostel || issue.hostelDetails?.hostel || studentData.hostel || studentData.hostelDetails?.hostel;
                            return issueHostel === assignedEntity;
                        });
                    } else {
                        // Filter by floor
                        relevantIssues = studentIssues.filter((issue: any) => {
                            const issueFloor = issue.floor || issue.hostelDetails?.floor || studentData.floor || studentData.hostelDetails?.floor;
                            return issueFloor === assignedEntity;
                        });
                        
                        // Floor attendants only see maintenance issues if explicitly requested
                        if (role === "floor_attendant" && type === "maintenance") {
                            relevantIssues = relevantIssues.filter((issue: any) => issue.type === "maintenance");
                        }
                    }
                }
                
                // Apply status filter if provided
                if (status === "pending") {
                    relevantIssues = relevantIssues.filter((issue: any) => !issue.solved);
                } else if (status === "solved") {
                    relevantIssues = relevantIssues.filter((issue: any) => issue.solved);
                }
                
                // Process each issue
                const processedIssues = relevantIssues.map((issue: any) => {
                    return {
                        ...issue,
                        studentName: studentData.fullName || studentData.name || "Unknown",
                        studentId: studentDoc.id,
                        hostel: issue.hostel || issue.hostelDetails?.hostel || studentData.hostel || studentData.hostelDetails?.hostel,
                        floor: issue.floor || issue.hostelDetails?.floor || studentData.floor || studentData.hostelDetails?.floor,
                        room: issue.room || issue.hostelDetails?.roomNumber || studentData.room,
                        timestamp: issue.timestamp || new Date().toISOString(),
                        solved: issue.solved || issue.isSolved || false
                    };
                });
                
                maintenanceIssues = [...maintenanceIssues, ...processedIssues];
            }
            
            // Sort by timestamp (newest first)
            maintenanceIssues.sort((a, b) => {
                const dateA = new Date(a.timestamp).getTime();
                const dateB = new Date(b.timestamp).getTime();
                return dateB - dateA;
            });
        }

        return NextResponse.json({ maintenanceIssues });
    } catch (error) {
        console.error("Error fetching issues:", error);
        return NextResponse.json({
            error: "Failed to fetch issues",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
