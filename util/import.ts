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
  email: string;
  name: string;
  username: string;
  role: "super-admin" | "admin" | "co-admin" | "student";
}

interface SuperAdmin extends User {
  hostels: string[];
}

interface Admin extends User { }

interface FloorWarden extends User { }

interface Remark {
  date: string;
  dot: boolean;
  comment?: string;
}

interface Issues {
  type: string;
  date: string;
  message: string;
  isSolved: boolean;
}

interface Student extends User {
  registrationNumber: string;
  remarks: Remark[];
  issues: Issues[];
}
interface Room {
  room_num: string;
  room_capacity: number;
  room_occupant: Student[];
  room_image: { url: string; description: string }[];
}

interface Floor {
  floor_id: string;
  floor_warden: FloorWarden;
  rooms: Room[];
}

// Main data type for JSON structure
interface HostelData {
  "super-admin": SuperAdmin[];
  admin?: Admin; // Optional to avoid errors
  floors: Floor[];
}

async function uploadData() {
  try {
    // Read and parse JSON file
    const jsonFilePath = path.join(__dirname, "../data/BH1.json");
    const jsonData: HostelData = JSON.parse(fs.readFileSync(jsonFilePath, "utf-8"));

    console.log("🚀 Uploading data to Firestore...");

    // Upload Super Admins
    for (const superAdmin of jsonData["super-admin"]) {
      if (!superAdmin.username) {
        console.warn("⚠️ Skipping super-admin with missing username", superAdmin);
        continue;
      }
      await db.collection("super-admins").doc(superAdmin.username).set(superAdmin);
    }

    // Upload Admin (Handle missing admin)
    if (!jsonData.admin || !jsonData.admin.username) {
      console.warn("⚠️ Admin username is missing! Skipping admin upload.");
    } else {
      await db.collection("admins").doc(jsonData.admin.username).set(jsonData.admin);
    }

    // Upload Hostel Floors and Rooms
    const hostelRef = db.collection("hostels").doc("BH1");
    await hostelRef.set({ name: "BH1", admin: jsonData.admin?.username || "unknown" });

    for (const floor of jsonData.floors) {
      if (!floor.floor_id) {
        console.warn("⚠️ Skipping floor with missing floor_id", floor);
        continue;
      }

      const floorRef = hostelRef.collection("floors").doc(floor.floor_id);
      await floorRef.set({ floorWarden: floor.floor_warden });

      for (const room of floor.rooms) {
        if (!room.room_num) {
          console.warn("⚠️ Skipping room with missing room_num", room);
          continue;
        }

        const roomRef = floorRef.collection("rooms").doc(room.room_num);
        await roomRef.set({
          room_capacity: room.room_capacity,
          room_image: room.room_image || [],
        });

        // Upload Room Occupants (Students)
        for (const occupant of room.room_occupant) {
          if (!occupant.username) {
            console.warn("⚠️ Skipping student with missing username", occupant);
            continue;
          }

          const occupantRef = roomRef.collection("occupants").doc(occupant.username);
          await occupantRef.set({
            email: occupant.email,
            name: occupant.name,
            username: occupant.username,
            role: occupant.role,
            remarks: occupant.remarks || [],
          });

          // Store students separately in a "students" collection
          await db.collection("students").doc(occupant.username).set({
            email: occupant.email,
            name: occupant.name,
            username: occupant.username,
            role: occupant.role,
            hostel: "BH1",
            floor: floor.floor_id,
            room_num: room.room_num,
            remarks: occupant.remarks || [],
          });
        }
      }
    }

    console.log("✅ Data uploaded successfully!");
  } catch (error) {
    console.error("❌ Error uploading data:", error);
  }
}

// Run the Upload Function
uploadData();