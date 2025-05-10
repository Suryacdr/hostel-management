import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import studentsData from "./students.json";

// Load Firebase service account key
const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Define interfaces
interface HostelDetails {
  hostelId: string;
  room_id: string;
  roomNumber: string;
  floor: string;
}

interface Student {
  fullName: string;
  registrationNumber: number;
  email: string;
  course: string;
  year: string;
  dateOfOccupancy: string;
  issues: any[];
  pictureProfileUrl: string;
  age: number;
  phoneNumber: number;
  parentsDetails: any[];
  hostelDetails: HostelDetails;
}

/**
 * Updates the student data in Firestore with data from students.json
 */
async function updateStudentData() {
  try {
    console.log("🚀 Starting student data update process...");
    
    // Get reference to students collection
    const studentsCollection = db.collection("students");
    
    // Get all existing students to find which ones to update
    const existingStudentsSnapshot = await studentsCollection.get();
    const existingStudentEmails = new Map();
    
    existingStudentsSnapshot.forEach(doc => {
      const studentData = doc.data();
      if (studentData.email) {
        existingStudentEmails.set(studentData.email, doc.id);
      }
    });
    
    console.log(`📊 Found ${existingStudentsSnapshot.size} existing student records`);
    console.log(`📊 Processing ${studentsData.length} students from JSON data`);
    
    let updatedCount = 0;
    let createdCount = 0;
    let errorCount = 0;
    
    // Process each student in the JSON data
    let batch = db.batch();
    const maxBatchSize = 500; // Firestore batch limit
    let batchCount = 0;
    let batchIndex = 0;
    
    for (const student of studentsData) {
      try {
        if (!student || !student.email) {
          console.warn("⚠️ Skipping student with missing email");
          continue;
        }
        
        const email = student.email;
        const docId = existingStudentEmails.get(email);
        
        // Map student data to consistent format
        const studentDataToStore: Student = {
          fullName: student.fullName || "",
          registrationNumber: Number(student.registrationNumber) || 0,
          email: student.email,
          course: student.course ? student.course.trim() : "",
          year: student.year || "",
          dateOfOccupancy: student.dateOfOccupancy || "",
          issues: student.issues || [],
          pictureProfileUrl: student.profilePictureUrl || "",
          age: student.age || 0,
          phoneNumber: student.phoneNumber || 0,
          parentsDetails: student.parentsDetails || [],
          hostelDetails: {
            hostelId: student.hostelDetails?.hostelId || "",
            room_id: student.hostelDetails?.room_id || "",
            roomNumber: student.hostelDetails?.roomNumber || "",
            floor: student.hostelDetails?.floor || "",
          }
        };
        
        if (docId) {
          // Update existing student
          const docRef = studentsCollection.doc(docId);
          batch.set(docRef, studentDataToStore, { merge: true });
          updatedCount++;
        } else {
          // Create new student
          const docRef = studentsCollection.doc();
          batch.set(docRef, studentDataToStore);
          createdCount++;
        }
        
        batchCount++;
        
        // If batch size reaches limit, commit and start a new batch
        if (batchCount >= maxBatchSize) {
          console.log(`🔄 Committing batch ${batchIndex + 1}...`);
          await batch.commit();
          console.log(`✅ Batch ${batchIndex + 1} committed successfully!`);
          batchCount = 0;
          batchIndex++;
          batch = db.batch(); // Create a new batch
        }
      } catch (error) {
        console.error(`❌ Error processing student ${student.fullName || 'unknown'}:`, error);
        errorCount++;
      }
    }
    
    // Commit any remaining changes
    if (batchCount > 0) {
      console.log(`🔄 Committing final batch...`);
      await batch.commit();
      console.log(`✅ Final batch committed successfully!`);
    }
    
    console.log("✅ Student data update completed!");
    console.log(`📈 Stats: Updated ${updatedCount}, Created ${createdCount}, Errors ${errorCount}`);
    
    // Update room occupancy data
    await updateRoomOccupancy();
    
    return {
      success: true,
      updated: updatedCount,
      created: createdCount,
      errors: errorCount
    };
  } catch (error) {
    console.error("❌ Error updating student data:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Updates room occupancy information based on student hostel details
 */
async function updateRoomOccupancy() {
  try {
    console.log("🔄 Updating room occupancy data...");
    
    // Group students by hostel/room
    const roomOccupancyMap = new Map();
    
    for (const student of studentsData) {
      if (!student.hostelDetails || !student.hostelDetails.hostelId || !student.hostelDetails.room_id) {
        continue;
      }
      
      const hostelId = student.hostelDetails.hostelId;
      const roomId = student.hostelDetails.room_id;
      const key = `${hostelId}:${roomId}`;
      
      if (!roomOccupancyMap.has(key)) {
        roomOccupancyMap.set(key, {
          hostelId: hostelId,
          roomId: roomId,
          occupants: []
        });
      }
      
      roomOccupancyMap.get(key).occupants.push(student.email);
    }
    
    // Get all hostels
    const hostelsSnapshot = await db.collection("hostels").get();
    let roomsUpdated = 0;
    
    // Process each hostel
    for (const hostelDoc of hostelsSnapshot.docs) {
      const hostelId = hostelDoc.id;
      
      // Get all floors for this hostel
      const floorsSnapshot = await hostelDoc.ref.collection("floors").get();
      
      // Process each floor
      for (const floorDoc of floorsSnapshot.docs) {
        const floorId = floorDoc.id;
        
        // Get rooms for this floor
        const roomsCollection = floorDoc.ref.collection("rooms");
        const roomsSnapshot = await roomsCollection.get();
        
        // Update each room's occupants
        for (const roomDoc of roomsSnapshot.docs) {
          const roomNum = roomDoc.data().room_num;
          const roomFullId = `${hostelId}:${floorId}-${roomNum}`;
          
          if (roomOccupancyMap.has(roomFullId)) {
            const occupants = roomOccupancyMap.get(roomFullId).occupants;
            await roomDoc.ref.update({ occupants: occupants });
            roomsUpdated++;
          }
        }
      }
    }
    
    console.log(`✅ Room occupancy updated for ${roomsUpdated} rooms`);
    return { success: true, roomsUpdated };
  } catch (error) {
    console.error("❌ Error updating room occupancy:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

// Execute the update
updateStudentData().then((result) => {
  console.log("Operation completed with result:", result);
}).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
