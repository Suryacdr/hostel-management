import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import admin from "firebase-admin";

// Correct the path to the service account key file
const serviceAccount = require("@/serviceAccountKey.json");

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

export async function GET(request: NextRequest) {
    try {
        // Get the authorization token from the request headers
        const authHeader = request.headers.get("authorization");
        console.log('Auth Header received:', authHeader ? 'Yes' : 'No');

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.log('Invalid auth header format');
            return NextResponse.json(
                { error: "Unauthorized: Missing or invalid token" },
                { status: 401 }
            );
        }

        const token = authHeader.split("Bearer ")[1];
        console.log('Token length:', token.length);

        // Verify the token and get user information
        try {
            const decodedToken = await getAuth().verifyIdToken(token);
            console.log('Token verified successfully');

            // Get user record to ensure we have the latest claims
            const userRecord = await getAuth().getUser(decodedToken.uid);
            const role = userRecord.customClaims?.role || decodedToken.role;

            if (!role) {
                console.log('No role found for user');
                return NextResponse.json(
                    { error: "Unauthorized: User has no assigned role" },
                    { status: 403 }
                );
            }

            console.log('User role:', role);
            const { uid } = decodedToken;
            console.log('User UID:', uid);

            const db = getFirestore();
            let responseData = {};

            switch (role) {
                case "student":
                    // Get student-specific data
                    console.log('Fetching student data for UID:', uid);

                    // First try to find the student by UID
                    let studentSnapshot = await db.collection("students").where("uid", "==", uid).get();

                    // If no results, try to find by email
                    if (studentSnapshot.empty) {
                        console.log('No student found by UID, trying email');
                        const email = userRecord.email;
                        studentSnapshot = await db.collection("students").where("email", "==", email).get();
                    }

                    if (studentSnapshot.empty) {
                        console.log('No student found in database');
                        return NextResponse.json(
                            { error: "Student data not found" },
                            { status: 404 }
                        );
                    }

                    const studentDoc = studentSnapshot.docs[0];
                    const studentData = studentDoc.data();
                    console.log('Student data found:', studentDoc.id);

                    // Get complaints and maintenance for this student
                    const complaints = studentData.complaints || [];
                    const maintenance = studentData.maintenance || [];

                    responseData = {
                        student: {
                            id: studentDoc.id,
                            name: studentData.fullName,
                            email: studentData.email,
                            course: studentData.course,
                            department: studentData.course?.split(" ").pop() || "",
                            room: studentData.hostelDetails?.roomNumber || ""
                        },
                        complaints: complaints.map((complaint: any) => ({
                            id: complaint.id,
                            ...complaint,
                            timestamp: complaint.timestamp?.toDate() || new Date()
                        })),
                        maintenance: maintenance.map((issue: any) => ({
                            id: issue.id,
                            ...issue,
                            timestamp: issue.timestamp?.toDate() || new Date()
                        })),
                        issues: studentData.issues || [],
                        remarks: studentData.remarks || []
                    };
                    break;

                case "chief_warden":
                    // Get all hostels
                    const hostelsSnapshot = await db.collection("hostels").get();
                    const hostels = hostelsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    // Get all students to aggregate their complaints and maintenance
                    const studentsSnapshot = await db.collection("students").get();
                    const allComplaints: Array<{
                        studentId: string;
                        studentName: string;
                        [key: string]: any;
                    }> = [];
                    const allMaintenance: Array<{
                        studentId: string;
                        studentName: string;
                        [key: string]: any;
                    }> = [];

                    studentsSnapshot.docs.forEach(doc => {
                        const studentData = doc.data();
                        if (studentData.complaints) {
                            allComplaints.push(...studentData.complaints.map((complaint: any) => ({
                                ...complaint,
                                studentId: doc.id,
                                studentName: studentData.fullName
                            })));
                        }
                        if (studentData.maintenance) {
                            allMaintenance.push(...studentData.maintenance.map((maintenance: any) => ({
                                ...maintenance,
                                studentId: doc.id,
                                studentName: studentData.fullName
                            })));
                        }
                    });

                    responseData = {
                        hostels,
                        complaints: allComplaints,
                        maintenance: allMaintenance
                    };
                    break;

                case "hostel_warden":
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

                    // Get hostel data
                    const hostelDoc = await db.collection("hostels").doc(hostelId).get();

                    // Get floors in the hostel
                    const floorsSnapshot = await db
                        .collection("floors")
                        .where("hostelId", "==", hostelId)
                        .get();

                    // Get complaints and maintenance for this hostel
                    const hostelStudentsSnapshot = await db.collection("students").where("hostelId", "==", hostelId).get();
                    const hostelComplaints: Array<{
                        studentId: string;
                        studentName: string;
                        [key: string]: any;
                    }> = [];
                    const hostelMaintenance: Array<{
                        studentId: string;
                        studentName: string;
                        [key: string]: any;
                    }> = [];

                    hostelStudentsSnapshot.docs.forEach(doc => {
                        const studentData = doc.data();
                        if (studentData.complaints) {
                            hostelComplaints.push(...studentData.complaints.map((complaint: any) => ({
                                ...complaint,
                                studentId: doc.id,
                                studentName: studentData.fullName
                            })));
                        }
                        if (studentData.maintenance) {
                            hostelMaintenance.push(...studentData.maintenance.map((maintenance: any) => ({
                                ...maintenance,
                                studentId: doc.id,
                                studentName: studentData.fullName
                            })));
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
                        maintenance: hostelMaintenance
                    };
                    break;

                case "floor_warden":
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

                    // Get floors data
                    const assignedFloorsData = await Promise.all(
                        assignedFloors.map(async (floorId: string) => {
                            const floorDoc = await db.collection("floors").doc(floorId).get();
                            return floorDoc.exists ? { id: floorDoc.id, ...floorDoc.data() } : null;
                        })
                    );

                    // Get rooms in these floors
                    const roomsPromises = assignedFloors.map((floorId: string) =>
                        db.collection("rooms")
                            .where("floorId", "==", floorId)
                            .get()
                            .then(snapshot => snapshot.docs.map(doc => ({
                                id: doc.id,
                                ...doc.data()
                            })))
                    );

                    const roomsByFloor = await Promise.all(roomsPromises);

                    responseData = {
                        floorWarden: floorWardenData,
                        floors: assignedFloorsData.filter(Boolean),
                        rooms: roomsByFloor.flat()
                    };
                    break;

                case "floor_attendant":
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

                    // Get floor data
                    const floorDoc = await db.collection("floors").doc(floorId).get();

                    // Get rooms in the floor
                    const floorRoomsSnapshot = await db
                        .collection("rooms")
                        .where("floorId", "==", floorId)
                        .get();

                    // Get maintenance requests for this floor
                    const floorStudentsSnapshot = await db.collection("students").where("floorId", "==", floorId).get();
                    const floorMaintenance: Array<{
                        studentId: string;
                        studentName: string;
                        [key: string]: any;
                    }> = [];

                    floorStudentsSnapshot.docs.forEach(doc => {
                        const studentData = doc.data();
                        if (studentData.maintenance) {
                            floorMaintenance.push(...studentData.maintenance.map((maintenance: any) => ({
                                ...maintenance,
                                studentId: doc.id,
                                studentName: studentData.fullName
                            })));
                        }
                    });

                    responseData = {
                        attendant: attendantData,
                        floor: floorDoc.exists ? { id: floorDoc.id, ...floorDoc.data() } : null,
                        rooms: floorRoomsSnapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        })),
                        maintenance: floorMaintenance
                    };
                    break;

                default:
                    return NextResponse.json(
                        { error: "Invalid role" },
                        { status: 403 }
                    );
            }

            return NextResponse.json(responseData);
        } catch (error) {
            console.error("Error verifying token:", error);
            return NextResponse.json(
                { error: "Unauthorized: Invalid token" },
                { status: 401 }
            );
        }
    } catch (error) {
        console.error("Error in fetch route:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
