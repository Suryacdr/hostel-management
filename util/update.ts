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

// Define Interfaces
interface Bucket {
    name: string;
    uploadedAt: string;
    updatedAt: string;
    uploadedBy: string;
    imageURL: string;
}

interface Student {
    fullName: string;
    email: string;
    phoneNumber: string;
    role: "student";
    profilePictureUrl: string;
    firstName: string;
    lastName: string;
    age: number;
    registrationNumber: number;
    parentsName: { father: string; mother: string };
    course: string;
    permanentAddress: { street: string; city: string; state: string; pincode: string };
    hostelDetails: { hostel: string; roomNumber: string; floor: string };
    roommateDetails: { roommateId: string; roommateName: string };
    remarks: { date: string; dot: boolean; comment: string; reportedBy: string }[];
    issues: { 
        type: string;
        id: string;
        date: string; 
        time: string;
        message: string; 
        status: string;
        isSolved: boolean;
        completedDate?: string;
        remarks?: string;
        hostelDetails: {  // Replace simple roomNumber with detailed location
            hostel: string;
            floor: string;
            roomNumber: string;
        };
        category?: string;  // Category specifically for maintenance type
    }[];
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
    floors: { [key: string]: HostelFloor };
}

interface HostelData {
    roles: { [key: string]: any };
    hostels: { [key: string]: Hostel };
    students: { [key: string]: Student };
}

// Function to update Firestore
async function updateData() {
    try {
        const jsonFilePath = path.join(__dirname, "./hostel_data.json");
        const jsonData: HostelData = JSON.parse(fs.readFileSync(jsonFilePath, "utf-8"));

        console.log("🚀 Updating data in Firestore...");

        // Update roles (Chief Warden, Supervisors, Hostel Wardens, etc.)
        for (const [role, users] of Object.entries(jsonData.roles)) {
            for (const userData of Object.values(users) as admin.firestore.DocumentData[]) {
                const querySnapshot = await db.collection(role).where("email", "==", userData.email).get();
                if (!querySnapshot.empty) {
                    const docRef = querySnapshot.docs[0].ref;
                    await docRef.set(userData, { merge: true });
                    console.log(`✅ Updated ${role} with email: ${userData.email}`);
                } else {
                    const docRef = await db.collection(role).add(userData);
                    console.log(`✅ Added ${role} with UID: ${docRef.id}`);
                }
            }
        }

        // Update hostels
        for (const [hostelId, hostelData] of Object.entries(jsonData.hostels)) {
            const querySnapshot = await db.collection("hostels").where("name", "==", hostelData.name).get();
            if (!querySnapshot.empty) {
                const docRef = querySnapshot.docs[0].ref;
                await docRef.set(hostelData, { merge: true });
                console.log(`✅ Updated hostel: ${hostelData.name}`);
            } else {
                const hostelRef = await db.collection("hostels").add(hostelData);
                console.log(`✅ Added hostel: ${hostelId} with UID: ${hostelRef.id}`);
            }
        }

        // Update students
        for (const studentData of Object.values(jsonData.students)) {
            const querySnapshot = await db.collection("students").where("email", "==", studentData.email).get();
            if (!querySnapshot.empty) {
                const docRef = querySnapshot.docs[0].ref;
                await docRef.set(studentData, { merge: true });
                console.log(`✅ Updated student: ${studentData.fullName}`);
            } else {
                const studentRef = await db.collection("students").add({
                    ...studentData,
                    bucket: studentData.bucket || []
                });
                console.log(`✅ Added student: ${studentData.fullName} with UID: ${studentRef.id}`);
            }

            // Assign student to their room
            const { hostel, floor, roomNumber } = studentData.hostelDetails;
            const roomRef = db
                .collection("hostels")
                .where("name", "==", hostel)
                .limit(1);
            const hostelSnapshot = await roomRef.get();
            if (!hostelSnapshot.empty) {
                const hostelDoc = hostelSnapshot.docs[0].ref;
                const floorSnapshot = await hostelDoc.collection("floors").where("floorWarden", "==", floor).limit(1).get();
                if (!floorSnapshot.empty) {
                    const floorDoc = floorSnapshot.docs[0].ref;
                    const roomSnapshot = await floorDoc.collection("rooms").where("room_num", "==", roomNumber).limit(1).get();
                    if (!roomSnapshot.empty) {
                        const roomDoc = roomSnapshot.docs[0].ref;
                        await roomDoc.update({
                            occupants: admin.firestore.FieldValue.arrayUnion(studentData.email)
                        });
                        console.log(`✅ Assigned student ${studentData.fullName} to room ${roomNumber}`);
                    }
                }
            }
        }

        console.log("✅ Firestore update completed!");
    } catch (error) {
        console.error("❌ Error updating Firestore:", error);
    }
}

// Run the function
updateData();