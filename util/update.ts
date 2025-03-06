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
    admin?: Admin;
    floors: Floor[];
}

// Function to Update Firestore
async function updateData() {
    try {
        // Read and parse JSON file
        const jsonFilePath = path.join(__dirname, "../data/BH1.json");
        const jsonData: HostelData = JSON.parse(fs.readFileSync(jsonFilePath, "utf-8"));

        console.log("🚀 Updating data in Firestore...");

        // Update Super Admins
        for (const superAdmin of jsonData["super-admin"]) {
            if (!superAdmin.username) {
                console.warn("⚠️ Skipping super-admin with missing username", superAdmin);
                continue;
            }
            const docRef = db.collection("super-admins").doc(superAdmin.username);
            await docRef.set(superAdmin, { merge: true });
        }

        // Update Admin (If exists, update only changed fields)
        if (jsonData.admin?.username) {
            const adminRef = db.collection("admins").doc(jsonData.admin.username);
            await adminRef.set(jsonData.admin, { merge: true });
        } else {
            console.warn("⚠️ Admin username is missing! Skipping admin update.");
        }

        // Update Hostel Floors and Rooms
        const hostelRef = db.collection("hostels").doc("BH1");
        await hostelRef.set({ name: "BH1", admin: jsonData.admin?.username || "unknown" }, { merge: true });

        for (const floor of jsonData.floors) {
            if (!floor.floor_id) {
                console.warn("⚠️ Skipping floor with missing floor_id", floor);
                continue;
            }

            const floorRef = hostelRef.collection("floors").doc(floor.floor_id);
            await floorRef.set({ floorWarden: floor.floor_warden }, { merge: true });

            for (const room of floor.rooms) {
                if (!room.room_num) {
                    console.warn("⚠️ Skipping room with missing room_num", room);
                    continue;
                }

                const roomRef = floorRef.collection("rooms").doc(room.room_num);
                await roomRef.set(
                    {
                        room_capacity: room.room_capacity,
                        room_image: room.room_image || [],
                    },
                    { merge: true }
                );

                // Update Room Occupants (Students)
                for (const occupant of room.room_occupant) {
                    if (!occupant.username || !occupant.registrationNumber) {
                        console.warn("⚠️ Skipping student with missing username or registrationNumber", occupant);
                        continue;
                    }

                    const occupantRef = roomRef.collection("occupants").doc(occupant.username);
                    await occupantRef.set(
                        {
                            email: occupant.email,
                            name: occupant.name,
                            username: occupant.username,
                            role: occupant.role,
                            registrationNumber: occupant.registrationNumber,
                            remarks: occupant.remarks || [],
                            issues: occupant.issues || [],
                        },
                        { merge: true }
                    );

                    // Optional: Store students separately in a "students" collection
                    const studentRef = db.collection("students").doc(occupant.username);
                    await studentRef.set(
                        {
                            email: occupant.email,
                            name: occupant.name,
                            username: occupant.username,
                            role: occupant.role,
                            registrationNumber: occupant.registrationNumber,
                            hostel: "BH1",
                            floor: floor.floor_id,
                            room_num: room.room_num,
                            remarks: occupant.remarks || [],
                            issues: occupant.issues || [],
                        },
                        { merge: true }
                    );
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
