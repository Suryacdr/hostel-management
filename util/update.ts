import admin from "firebase-admin";
import fs from "fs";
import path from "path";

// Load Firebase service account key
const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

// Define Types
interface User {
    fullName: string;
    email: string;
    phoneNumber: string;
    role: "chief_warden" | "supervisor" | "hostel_warden" | "floor_warden" | "floor_attendant" | "student";
    profilePictureUrl: string; // Added profilePictureUrl
}

interface ChiefWarden extends User {
    accessLevel: "all";
}

interface Supervisor extends User {
    assignedHostels: string[];
    reportsTo: string;
}

interface HostelWarden extends User {
    assignedHostel: string;
    reportsTo: string;
}

interface FloorWarden extends User {
    assignedHostel: string;
    assignedFloors: string[];
    reportsTo: string;
}

interface FloorAttendant extends User {
    assignedHostel: string;
    assignedFloors: string[];
    reportsTo: string;
}

interface ParentsName {
    father: string;
    mother: string;
}

interface Address {
    street: string;
    city: string;
    state: string;
    pincode: string;
}

interface HostelDetails {
    hostel: string;
    roomNumber: string;
    floor: string;
}

interface RoommateDetails {
    roommateId: string;
    roommateName: string;
}

interface Remark {
    date: string;
    dot: boolean;
    comment: string;
    reportedBy: string;
}

interface Issue {
    type: string;
    date: string;
    message: string;
    isSolved: boolean;
    reportedTo: string;
}

interface Bucket {
    name: string;
    updatedOn: string;
    createdAt: string;
    createdBy: string;
    files: string[];    
}

interface Student extends User {
    firstName: string;
    lastName: string;
    age: number;
    registrationNumber: number;
    parentsName: ParentsName;
    course: string;
    permanentAddress: Address;
    hostelDetails: HostelDetails;
    roommateDetails: RoommateDetails;
    remarks: Remark[];
    issues: Issue[];
    bucket: Bucket[];
}

interface HostelFloor {
    floorWarden: string;
    floorAttendant: string;
    rooms: string[];
}

interface Hostel {
    name: string;
    warden: string;
    supervisor: string;
    totalFloors: number;
    totalRooms: number;
    floors: {
        [key: string]: HostelFloor;
    };
}

interface HostelData {
    roles: {
        chief_warden: { [key: string]: ChiefWarden };
        supervisors: { [key: string]: Supervisor };
        hostel_wardens: { [key: string]: HostelWarden };
        floor_wardens: { [key: string]: FloorWarden };
        floor_attendants: { [key: string]: FloorAttendant };
    };
    hostels: { [key: string]: Hostel };
    students: { [key: string]: Student };
}

// Function to Update Firestore
async function updateData() {
    try {
        // Read and parse JSON file
        const jsonFilePath = path.join(__dirname, "./hostel_data.json");
        const jsonData: HostelData = JSON.parse(fs.readFileSync(jsonFilePath, "utf-8"));

        console.log("🚀 Updating data in Firestore...");

        // Update roles
        const roles = ["chief_warden", "supervisors", "hostel_wardens", "floor_wardens", "floor_attendants"];
        for (const role of roles) {
            for (const [id, userData] of Object.entries(jsonData.roles[role as keyof typeof jsonData.roles])) {
                const docRef = db.collection(role).doc(id);
                await docRef.set(userData as FirebaseFirestore.DocumentData, { merge: true });
                console.log(`✅ Updated ${role} with ID: ${id}`);
            }
        }

        // Update hostels
        for (const [hostelId, hostelData] of Object.entries(jsonData.hostels)) {
            const hostelRef = db.collection("hostels").doc(hostelId);
            await hostelRef.set(hostelData, { merge: true });
            console.log(`✅ Updated hostel: ${hostelId}`);

            // Update floors
            for (const [floorId, floorData] of Object.entries(hostelData.floors)) {
                const floorRef = hostelRef.collection("floors").doc(floorId);
                await floorRef.set(floorData, { merge: true });
                console.log(`✅ Updated floor: ${floorId} in hostel: ${hostelId}`);

                // Create room documents if they don't exist
                for (const roomId of floorData.rooms) {
                    const roomRef = floorRef.collection("rooms").doc(roomId);
                    await roomRef.set({
                        room_num: roomId,
                        room_capacity: 2, // Default capacity
                        occupants: []
                    }, { merge: true });
                    console.log(`✅ Updated room: ${roomId} on floor: ${floorId}`);
                }
            }
        }

        // Update students
        for (const [studentId, studentData] of Object.entries(jsonData.students)) {
            // Store in students collection
            const studentRef = db.collection("students").doc(studentId);
            await studentRef.set(studentData, { merge: true });
            console.log(`✅ Updated student: ${studentId}`);

            // Add student to their assigned room
            const { hostel, floor, roomNumber } = studentData.hostelDetails;
            const roomRef = db
                .collection("hostels")
                .doc(hostel)
                .collection("floors")
                .doc(floor)
                .collection("rooms")
                .doc(roomNumber);

            await roomRef.update({
                occupants: admin.firestore.FieldValue.arrayUnion(studentId)
            });
            console.log(`✅ Added student ${studentId} to room ${roomNumber}`);

            // Update student's bucket data
            if (studentData.bucket && studentData.bucket.length > 0) {
                for (const bucket of studentData.bucket) {
                    const bucketRef = studentRef.collection("buckets").doc(bucket.name);
                    await bucketRef.set(bucket, { merge: true });
                    console.log(`✅ Updated bucket: ${bucket.name} for student: ${studentId}`);
                }
            }
        }

        console.log("✅ Firestore updated successfully!");
    } catch (error) {
        console.error("❌ Error updating Firestore:", error);
    }
}

// Run the Update Function
updateData();
