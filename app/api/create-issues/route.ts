import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Define interfaces for type safety
interface HostelDetails {
  hostel?: string | null;
  floor?: string | null;
  roomNumber?: string | null;
}

interface RequestBody {
  content?: string;
  type?: 'complaint' | 'maintenance';
  hostelDetails?: HostelDetails;
  category?: string;
}

interface StudentData {
  uid: string;
  email?: string | null;
  fullName?: string | null;
  name?: string | null;
  id: string;
  course?: string;
  department?: string;
  room?: string | null;
  profilePictureUrl?: string;
  issues?: Array<IssueData>;
  createdAt?: FirebaseFirestore.FieldValue;
  hostelDetails?: HostelDetails;
  hostel?: string | null;
  floor?: string | null;
}

interface IssueData {
  id: string;
  message: string;
  type: string;
  timestamp: string;
  author: string | null;
  authorId: string;
  likes: number;
  isSolved: boolean;
  solved: boolean;
  status: string;
  completeDate: null | string;
  hostel: string | null;
  floor: string | null;
  room: string | null;
  hostelDetails: HostelDetails;
  studentRoom: string | null;
  studentName: string;
  studentId: string;
  category?: string;
}

const serviceAccount = require("@/serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = getFirestore();
const auth = getAuth();

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized: Missing or invalid token" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await auth.verifyIdToken(token);
        const uid = decodedToken.uid;

        if (!uid) {
            return NextResponse.json({ error: "Unauthorized: Invalid user, missing UID" }, { status: 401 });
        }

        const userRecord = await auth.getUser(uid);
        let body: RequestBody;
        try {
            const rawBody = await request.text();
            body = rawBody ? JSON.parse(rawBody) : null;
        } catch (e) {
            console.error("Error parsing request body:", e);
            return NextResponse.json({ error: "Invalid request body format" }, { status: 400 });
        }

        const { content, type, hostelDetails, category } = body || {};
        if (!content || !type) {
            return NextResponse.json({ error: "Missing required fields: content and type are required" }, { status: 400 });
        }

        if (!["complaint", "maintenance"].includes(type)) {
            return NextResponse.json({ error: "Invalid type value. Must be 'complaint' or 'maintenance'" }, { status: 400 });
        }

        // For maintenance issues, category is required
        if (type === "maintenance" && !category) {
            return NextResponse.json({ error: "Category is required for maintenance issues" }, { status: 400 });
        }

        let studentSnapshot = await db.collection("students").where("uid", "==", uid).get();
        if (studentSnapshot.empty && userRecord.email) {
            studentSnapshot = await db.collection("students").where("email", "==", userRecord.email).get();
        }

        let studentDoc: FirebaseFirestore.QueryDocumentSnapshot;
        let studentData: StudentData;
        let studentId: string = uid;

        if (studentSnapshot.empty) {
            // If student not found, create a new student record
            studentData = {
                uid,
                email: userRecord.email,
                fullName: userRecord.displayName || "Student",
                id: userRecord.uid.substring(0, 8).toUpperCase(),
                course: "Not set",
                department: "Not set",
                room: "Not assigned",
                profilePictureUrl: userRecord.photoURL || "",
                issues: [],
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            
            // Include hostel details if provided
            if (hostelDetails) {
                studentData.hostelDetails = hostelDetails;
                studentData.hostel = hostelDetails.hostel || null;
                studentData.floor = hostelDetails.floor || null;
                studentData.room = hostelDetails.roomNumber || null;
            }
            
            await db.collection("students").doc(studentId).set(studentData);
        } else {
            studentDoc = studentSnapshot.docs[0];
            studentData = studentDoc.data() as StudentData;
            studentId = studentDoc.id;

            if (!studentData.issues) {
                await db.collection("students").doc(studentId).update({ issues: [] });
                studentData.issues = [];
            }
        }

        // Extract hostel information
        const issueHostelDetails: HostelDetails = hostelDetails || studentData.hostelDetails || {
            hostel: studentData.hostel,
            floor: studentData.floor,
            roomNumber: studentData.room
        };

        const issueId = Date.now().toString();
        const issueData: IssueData = {
            id: issueId,
            message: content as string,
            type: type as string,
            timestamp: new Date().toISOString(),
            author: studentData.fullName || studentData.name || userRecord.displayName || "",
            authorId: uid,
            likes: 0,
            isSolved: false,
            solved: false,
            status: "open",
            completeDate: null,
            hostel: issueHostelDetails.hostel || null,
            floor: issueHostelDetails.floor || null,
            room: issueHostelDetails.roomNumber || null,
            hostelDetails: issueHostelDetails,
            studentRoom: issueHostelDetails.roomNumber || studentData.room || null,
            studentName: studentData.fullName || studentData.name || userRecord.displayName || "Unknown Student",
            studentId: studentId,
        };

        // Add category for maintenance issues
        if (type === "maintenance" && category) {
            issueData.category = category;
        }

        console.log("Creating new issue:", issueData);

        await db.collection("students").doc(studentId).update({
            issues: admin.firestore.FieldValue.arrayUnion(issueData),
        });

        return NextResponse.json({ message: "Issue created successfully", issueId, postId: issueId }, { status: 201 });
    } catch (error) {
        console.error("Error creating issue:", error instanceof Error ? error.message : "Unknown error");
        return NextResponse.json({ error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}` }, { status: 500 });
    }
}