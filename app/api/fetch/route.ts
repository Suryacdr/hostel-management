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

// Helper types
type MaintenanceOrComplaint = {
    id: string;
    studentId?: string;
    studentName?: string;
    message: string;
    timestamp: Date;
    [key: string]: any;
};

type Issue = {
    id: string;
    studentId?: string;
    studentName?: string;
    message: string;
    type: string; // 'complaint' or 'maintenance'
    timestamp: Date;
    author?: string;
    authorId?: string;
    likes?: number;
    solved?: boolean;
    [key: string]: any;
};

// Helper functions
const formatTimestamp = (timestamp: any): Date => {
    return timestamp?.toDate?.() || new Date();
};

const mapItemsWithStudent = (items: any[] = [], studentId: string, studentName: string): MaintenanceOrComplaint[] => {
    return items.map(item => ({
        ...item,
        studentId,
        studentName,
        timestamp: formatTimestamp(item.timestamp)
    }));
};

const mapIssuesWithStudent = (issues: any[] = [], studentId: string, studentName: string): Issue[] => {
    return issues.map(issue => ({
        ...issue,
        studentId,
        studentName,
        timestamp: formatTimestamp(issue.timestamp)
    }));
};

export async function GET(request: NextRequest) {
    try {
        // Validate auth token
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Unauthorized: Missing or invalid token" },
                { status: 401 }
            );
        }

        const token = authHeader.split("Bearer ")[1];
        let decodedToken, userRecord, role, uid;

        try {
            // Verify token and get user data
            decodedToken = await getAuth().verifyIdToken(token);
            uid = decodedToken.uid;
            userRecord = await getAuth().getUser(uid);
            role = userRecord.customClaims?.role || decodedToken.role;

            if (!role) {
                return NextResponse.json(
                    { error: "Unauthorized: User has no assigned role" },
                    { status: 403 }
                );
            }
        } catch (error) {
            return NextResponse.json(
                { error: "Unauthorized: Invalid token" },
                { status: 401 }
            );
        }

        const db = getFirestore();
        let responseData = {};

        switch (role) {
            case "student": {
                // Find student by UID or email
                let studentSnapshot = await db.collection("students").where("uid", "==", uid).get();

                if (studentSnapshot.empty && userRecord.email) {
                    studentSnapshot = await db.collection("students").where("email", "==", userRecord.email).get();
                }

                if (studentSnapshot.empty) {
                    return NextResponse.json(
                        { error: "Student data not found" },
                        { status: 404 }
                    );
                }

                const studentDoc = studentSnapshot.docs[0];
                const studentData = studentDoc.data();
                const complaints = studentData.complaints || [];
                const maintenance = studentData.maintenance || [];

                responseData = {
                    student: {
                        id: studentDoc.id,
                        name: studentData.fullName,
                        email: studentData.email,
                        course: studentData.course,
                        registrationNumber: studentData.registrationNumber || studentData.regestrationNumber || "",
                        department: studentData.course?.split(" ").pop() || "",
                        room: studentData.hostelDetails?.roomNumber || "",
                        profilePictureUrl: studentData.profilePictureUrl || ""
                    },
                    complaints: complaints.map((complaint: any) => ({
                        id: complaint.id,
                        ...complaint,
                        timestamp: formatTimestamp(complaint.timestamp)
                    })),
                    maintenance: maintenance.map((issue: any) => ({
                        id: issue.id,
                        ...issue,
                        timestamp: formatTimestamp(issue.timestamp)
                    })),
                    issues: (studentData.issues || []).map((issue: any) => ({
                        id: issue.id,
                        ...issue,
                        timestamp: formatTimestamp(issue.timestamp)
                    })),
                    remarks: studentData.remarks || []
                };
                break;
            }

            case "chief_warden": {
                // Fetch all hostels data
                const hostelsSnapshot = await db.collection("hostels").get();
                const hostels = hostelsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Fetch staff data with role filters
                const [supervisorsSnap, hostelWardensSnap, floorWardensSnap, floorAttendantsSnap] = await Promise.all([
                    db.collection("supervisors").where("role", "==", "supervisor").get(),
                    db.collection("hostel_wardens").where("role", "==", "hostel_warden").get(),
                    db.collection("floor_wardens").where("role", "==", "floor_warden").get(),
                    db.collection("floor_attendants").where("role", "==", "floor_attendant").get()
                ]);

                // Map staff data
                const supervisorsData = supervisorsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                const hostelWardensData = hostelWardensSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                const floorWardensData = floorWardensSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                const floorAttendantsData = floorAttendantsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Fetch all students for issues
                const studentsSnapshot = await db.collection("students").get();
                const allIssues: any[] = [];

                studentsSnapshot.docs.forEach(doc => {
                    const studentData = doc.data();
                    const studentId = doc.id;
                    const studentName = studentData.fullName;

                    // Collect all types of issues
                    if (studentData.issues && Array.isArray(studentData.issues)) {
                        const formattedIssues = studentData.issues.map((issue: any) => ({
                            ...issue,
                            id: issue.id || `${studentId}-${Date.now()}`,
                            studentId,
                            studentName,
                            timestamp: formatTimestamp(issue.timestamp || issue.date || new Date())
                        }));
                        allIssues.push(...formattedIssues);
                    }

                    // Include complaints as issues
                    if (studentData.complaints && Array.isArray(studentData.complaints)) {
                        const formattedComplaints = studentData.complaints.map((complaint: any) => ({
                            ...complaint,
                            id: complaint.id || `${studentId}-complaint-${Date.now()}`,
                            type: 'complaint',
                            studentId,
                            studentName,
                            timestamp: formatTimestamp(complaint.timestamp || complaint.date || new Date())
                        }));
                        allIssues.push(...formattedComplaints);
                    }

                    // Include maintenance requests as issues
                    if (studentData.maintenance && Array.isArray(studentData.maintenance)) {
                        const formattedMaintenance = studentData.maintenance.map((maintenance: any) => ({
                            ...maintenance,
                            id: maintenance.id || `${studentId}-maintenance-${Date.now()}`,
                            type: 'maintenance',
                            studentId,
                            studentName,
                            timestamp: formatTimestamp(maintenance.timestamp || maintenance.date || new Date())
                        }));
                        allIssues.push(...formattedMaintenance);
                    }
                });

                responseData = {
                    hostels,
                    supervisors: supervisorsData,
                    hostel_wardens: hostelWardensData,
                    floor_wardens: floorWardensData,
                    floor_attendants: floorAttendantsData,
                    issues: allIssues.sort((a, b) => {
                        const dateA = new Date(a.timestamp);
                        const dateB = new Date(b.timestamp);
                        return dateB.getTime() - dateA.getTime();
                    })
                };
                break;
            }

            case "hostel_warden": {
                // Get warden's assigned hostel
                const wardenDoc = await db.collection("staff").doc(uid).get();

                if (!wardenDoc.exists) {
                    return NextResponse.json(
                        { error: "Warden data not found" },
                        { status: 404 }
                    );
                }

                const wardenData = wardenDoc.data();
                const hostelId = wardenData?.assignedHostels?.[0];

                if (!hostelId) {
                    return NextResponse.json(
                        { error: "No hostel assigned to warden" },
                        { status: 404 }
                    );
                }

                // Parallel data fetching
                const [hostelDoc, floorsSnapshot, hostelStudentsSnapshot] = await Promise.all([
                    db.collection("hostels").doc(hostelId).get(),
                    db.collection("floors").where("hostelId", "==", hostelId).get(),
                    db.collection("students").where("hostelId", "==", hostelId).get()
                ]);

                // Process students and their complaints/maintenance/issues
                const hostelComplaints: MaintenanceOrComplaint[] = [];
                const hostelMaintenance: MaintenanceOrComplaint[] = [];
                const hostelIssues: Issue[] = [];

                hostelStudentsSnapshot.docs.forEach(doc => {
                    const studentData = doc.data();
                    const studentId = doc.id;
                    const studentName = studentData.fullName;

                    if (studentData.complaints) {
                        hostelComplaints.push(...mapItemsWithStudent(studentData.complaints, studentId, studentName));
                    }
                    if (studentData.maintenance) {
                        hostelMaintenance.push(...mapItemsWithStudent(studentData.maintenance, studentId, studentName));
                    }
                    if (studentData.issues) {
                        hostelIssues.push(...mapIssuesWithStudent(studentData.issues, studentId, studentName));
                    }
                });

                responseData = {
                    warden: wardenData,
                    hostel: hostelDoc.exists ? { id: hostelDoc.id, ...hostelDoc.data() } : null,
                    floors: floorsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })),
                    complaints: hostelComplaints,
                    maintenance: hostelMaintenance,
                    issues: hostelIssues
                };
                break;
            }

            case "floor_warden": {
                // Get floor warden's assigned floors
                const floorWardenDoc = await db.collection("staff").doc(uid).get();

                if (!floorWardenDoc.exists) {
                    return NextResponse.json(
                        { error: "Floor warden data not found" },
                        { status: 404 }
                    );
                }

                const floorWardenData = floorWardenDoc.data();
                const assignedFloors = floorWardenData?.assignedFloors || [];

                if (assignedFloors.length === 0) {
                    return NextResponse.json(
                        { error: "No floors assigned to floor warden" },
                        { status: 404 }
                    );
                }

                // Efficient batched queries using Promise.all
                const [floorsData, roomsData] = await Promise.all([
                    // Get floors data
                    Promise.all(
                        assignedFloors.map(async (floorId: string) => {
                            const floorDoc = await db.collection("floors").doc(floorId).get();
                            return floorDoc.exists ? { id: floorDoc.id, ...floorDoc.data() } : null;
                        })
                    ),
                    // Get rooms data
                    Promise.all(
                        assignedFloors.map((floorId: string) =>
                            db.collection("rooms")
                                .where("floorId", "==", floorId)
                                .get()
                                .then(snapshot => snapshot.docs.map(doc => ({
                                    id: doc.id,
                                    ...doc.data()
                                })))
                        )
                    )
                ]);

                // Get all students from assigned floors to fetch their issues
                const floorStudents = await Promise.all(
                    assignedFloors.map((floorId: string) =>
                        db.collection("students")
                            .where("floorId", "==", floorId)
                            .get()
                            .then(snapshot => snapshot.docs)
                    )
                );
                
                // Process students' issues
                const floorIssues: Issue[] = [];
                
                floorStudents.flat().forEach(doc => {
                    const studentData = doc.data();
                    const studentId = doc.id;
                    const studentName = studentData.fullName;
                    
                    if (studentData.issues) {
                        floorIssues.push(...mapIssuesWithStudent(studentData.issues, studentId, studentName));
                    }
                });
                
                responseData = {
                    floorWarden: floorWardenData,
                    floors: floorsData.filter(Boolean),
                    rooms: roomsData.flat(),
                    issues: floorIssues
                };
                break;
            }

            case "floor_attendant": {
                // Get floor attendant's assigned floor
                const attendantDoc = await db.collection("staff").doc(uid).get();

                if (!attendantDoc.exists) {
                    return NextResponse.json(
                        { error: "Floor attendant data not found" },
                        { status: 404 }
                    );
                }

                const attendantData = attendantDoc.data();
                const floorId = attendantData?.assignedFloors?.[0];

                if (!floorId) {
                    return NextResponse.json(
                        { error: "No floor assigned to attendant" },
                        { status: 404 }
                    );
                }

                // Parallel data fetching
                const [floorDoc, floorRoomsSnapshot, floorStudentsSnapshot] = await Promise.all([
                    db.collection("floors").doc(floorId).get(),
                    db.collection("rooms").where("floorId", "==", floorId).get(),
                    db.collection("students").where("floorId", "==", floorId).get()
                ]);

                // Process maintenance requests and issues
                const floorMaintenance: MaintenanceOrComplaint[] = [];
                const floorIssues: Issue[] = [];

                floorStudentsSnapshot.docs.forEach(doc => {
                    const studentData = doc.data();
                    const studentId = doc.id;
                    const studentName = studentData.fullName;
                    
                    if (studentData.maintenance) {
                        floorMaintenance.push(...mapItemsWithStudent(
                            studentData.maintenance,
                            studentId,
                            studentName
                        ));
                    }
                    
                    if (studentData.issues) {
                        // Filter only maintenance type issues for floor attendant
                        const maintenanceIssues = studentData.issues.filter((issue: any) => 
                            issue.type === 'maintenance'
                        );
                        
                        if (maintenanceIssues.length > 0) {
                            floorIssues.push(...mapIssuesWithStudent(
                                maintenanceIssues,
                                studentId,
                                studentName
                            ));
                        }
                    }
                });

                responseData = {
                    attendant: attendantData,
                    floor: floorDoc.exists ? { id: floorDoc.id, ...floorDoc.data() } : null,
                    rooms: floorRoomsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })),
                    maintenance: floorMaintenance,
                    issues: floorIssues
                };
                break;
            }

            default:
                return NextResponse.json(
                    { error: "Invalid role" },
                    { status: 403 }
                );
        }

        return NextResponse.json(responseData);
    } catch (error) {
        console.error("Error in fetch route:", error);
        return NextResponse.json(
            { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
