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
  profilePictureUrl: string;
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

async function uploadData() {
  try {
    const jsonFilePath = path.join(__dirname, "./hostel_data.json");
    const jsonData: HostelData = JSON.parse(fs.readFileSync(jsonFilePath, "utf-8"));

    console.log("🚀 Uploading data to Firestore...");

    // Upload roles
    const roles = ["chief_warden", "supervisors", "hostel_wardens", "floor_wardens", "floor_attendants"];
    for (const role of roles) {
      for (const userData of Object.values(jsonData.roles[role as keyof typeof jsonData.roles])) {
        await db.collection(role).add(userData as FirebaseFirestore.DocumentData);
      }
    }

    // Upload hostels
    for (const hostelData of Object.values(jsonData.hostels)) {
      const hostelRef = await db.collection("hostels").add(hostelData);

      // Upload floors
      for (const [floorId, floorData] of Object.entries(hostelData.floors)) {
        const floorRef = hostelRef.collection("floors").doc(floorId);
        await floorRef.set(floorData);
      }
    }

    // Upload students
    for (const studentData of Object.values(jsonData.students)) {
      const studentRef = await db.collection("students").add(studentData);

      // Add student to their assigned room
      const { hostel, floor, roomNumber } = studentData.hostelDetails;
      const roomRef = db
        .collection("hostels")
        .doc(hostel)
        .collection("floors")
        .doc(floor)
        .collection("rooms")
        .doc(roomNumber);

      await roomRef.set({
        occupants: admin.firestore.FieldValue.arrayUnion(studentRef.id)
      }, { merge: true });
    }

    console.log("✅ Data uploaded successfully!");
  } catch (error) {
    console.error("❌ Error uploading data:", error);
    throw error;
  }
}

// Run the Upload Function
uploadData();