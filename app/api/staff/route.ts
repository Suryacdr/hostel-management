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

// Define interfaces for staff types
interface BaseStaffMember {
    id: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    role: string;
    profilePictureUrl?: string;
    uid?: string;
}

interface FloorBasedStaff extends BaseStaffMember {
    assignedFloors: string[];
    assignedFloorNames?: string[];
}

interface HostelBasedStaff extends BaseStaffMember {
    assignedHostel: string;
    hostelName?: string;
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

        // Allowed roles for fetching staff
        const allowedRoles = ["chief_warden", "hostel_warden", "floor_warden", "supervisor"];
        if (!allowedRoles.includes(role)) {
            return NextResponse.json({ 
                error: "Unauthorized: Insufficient permissions to access staff data" 
            }, { status: 403 });
        }

        // Get query parameters
        const url = new URL(request.url);
        const floorIds = url.searchParams.get("floorIds")?.split(",") || [];
        const hostelId = url.searchParams.get("hostelId");
        const staffRole = url.searchParams.get("role"); // e.g., "floor_attendant"

        console.log(`Fetching staff with role ${staffRole} for ${role}. FloorIds: ${floorIds.join(", ")}, HostelId: ${hostelId}`);

        if (!staffRole) {
            return NextResponse.json({ error: "Missing required parameter: role" }, { status: 400 });
        }

        // Collection mapping based on role
        const roleToCollection: Record<string, string> = {
            "floor_attendant": "floor_attendants",
            "floor_warden": "floor_wardens",
            "hostel_warden": "hostel_wardens",
            "supervisor": "supervisors"
        };

        const collection = roleToCollection[staffRole];
        if (!collection) {
            return NextResponse.json({ error: "Invalid staff role" }, { status: 400 });
        }

        let staffQuery = db.collection(collection);
        
        // If looking for floor-based staff with specific floors
        if ((staffRole === "floor_attendant" || staffRole === "floor_warden") && floorIds.length > 0) {
            // Firestore doesn't support direct array-contains-any with multiple values for complex queries
            // We'll fetch all and filter in memory
            const staffSnapshot = await staffQuery.get();
            
            // Use proper type for floor-based staff
            const staff: FloorBasedStaff[] = staffSnapshot.docs
                .map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data as Omit<FloorBasedStaff, 'id'>
                    } as FloorBasedStaff;
                })
                .filter(staff => {
                    // Check if staff has any of the requested floors assigned
                    if (!staff.assignedFloors || !Array.isArray(staff.assignedFloors)) {
                        return false;
                    }
                    
                    return floorIds.some(floorId => staff.assignedFloors.includes(floorId));
                });
            
            if (staffRole === "floor_attendant") {
                return NextResponse.json({ floorAttendants: staff });
            } else {
                return NextResponse.json({ floorWardens: staff });
            }
        }
        
        // If looking for hostel-based staff with specific hostel
        else if ((staffRole === "hostel_warden" || staffRole === "supervisor") && hostelId) {
            const staffSnapshot = await staffQuery
                .where("assignedHostel", "==", hostelId)
                .get();
                
            // Use proper type for hostel-based staff
            const staff: HostelBasedStaff[] = staffSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data as Omit<HostelBasedStaff, 'id'>
                } as HostelBasedStaff;
            });
            
            if (staffRole === "hostel_warden") {
                return NextResponse.json({ hostelWardens: staff });
            } else {
                return NextResponse.json({ supervisors: staff });
            }
        }
        
        // If just fetching by role without specific filters
        else {
            const staffSnapshot = await staffQuery.get();
            
            // Determine the appropriate type based on the staff role
            if (staffRole === "floor_attendant" || staffRole === "floor_warden") {
                const staff: FloorBasedStaff[] = staffSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data as Omit<FloorBasedStaff, 'id'>
                    } as FloorBasedStaff;
                });
                
                if (staffRole === "floor_attendant") {
                    return NextResponse.json({ floorAttendants: staff });
                } else {
                    return NextResponse.json({ floorWardens: staff });
                }
            } else {
                const staff: HostelBasedStaff[] = staffSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data as Omit<HostelBasedStaff, 'id'>
                    } as HostelBasedStaff;
                });
                
                if (staffRole === "hostel_warden") {
                    return NextResponse.json({ hostelWardens: staff });
                } else {
                    return NextResponse.json({ supervisors: staff });
                }
            }
        }
    } catch (error) {
        console.error("Error fetching staff:", error);
        return NextResponse.json({ 
            error: "Failed to fetch staff",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
