import ChiefWardenData from "./chief_warden.json";
import FloorAttendantData from "./floor-attendant.json";
import HostelWardenData from "./hostel-warden.json";
import admin from "firebase-admin";

const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

// Define interfaces for staff data
interface ChiefWarden {
  fullName: string;
  email: string;
  profilePictureUrl: string;
  phoneNumber: string[];
  role: string;
  assignedHostel: string[];
  reportsTo: string;
}

interface FloorAttendant {
  fullName: string;
  email: string;
  profilePictureUrl: string;
  phoneNumber: string[];
  role: string;
  assignedFloorsName: string[];
  assignedFloors: string[];
  reportsTo: string;
}

interface HostelWarden {
  fullName: string;
  email: string;
  profilePictureUrl: string;
  phoneNumber: string[];
  role: string;
  assignedHostel: string[];
  reportsTo: string;
}

/**
 * Updates chief warden data in Firestore
 */
async function updateChiefWardenData() {
  try {
    console.log("🚀 Starting chief warden data update process...");
    
    // Get reference to chief_wardens collection
    const wardensCollection = db.collection("chief_wardens");
    
    // Get all existing chief wardens
    const existingWardensSnapshot = await wardensCollection.get();
    const existingWardensByName = new Map();
    
    existingWardensSnapshot.forEach(doc => {
      const wardenData = doc.data();
      if (wardenData.fullName) {
        existingWardensByName.set(wardenData.fullName, doc.id);
      }
    });
    
    console.log(`📊 Found ${existingWardensSnapshot.size} existing chief warden records`);
    console.log(`📊 Processing ${ChiefWardenData.length} chief wardens from JSON data`);
    
    let updatedCount = 0;
    let createdCount = 0;
    let errorCount = 0;
    
    // Process each chief warden in the JSON data
    let batch = db.batch();
    const maxBatchSize = 500; // Firestore batch limit
    let batchCount = 0;
    let batchIndex = 0;
    
    for (const warden of ChiefWardenData) {
      try {
        if (!warden || !warden.fullName) {
          console.warn("⚠️ Skipping chief warden with missing name");
          continue;
        }
        
        const fullName = warden.fullName;
        const docId = existingWardensByName.get(fullName);
        
        // Map warden data to consistent format
        const wardenDataToStore: ChiefWarden = {
          fullName: warden.fullName,
          email: warden.email,
          profilePictureUrl: warden.profilePictureUrl,
          phoneNumber: warden.phoneNumber,
          role: warden.role,
          assignedHostel: warden.assignedHostel,
          reportsTo: warden.reportsTo,
        };
        
        if (docId) {
          // Update existing warden
          const docRef = wardensCollection.doc(docId);
          batch.set(docRef, wardenDataToStore, { merge: true });
          updatedCount++;
        } else {
          // Create new warden
          const docRef = wardensCollection.doc();
          batch.set(docRef, wardenDataToStore);
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
        console.error(`❌ Error processing chief warden ${warden.fullName || 'unknown'}:`, error);
        errorCount++;
      }
    }
    
    // Commit any remaining changes
    if (batchCount > 0) {
      console.log(`🔄 Committing final batch...`);
      await batch.commit();
      console.log(`✅ Final batch committed successfully!`);
    }
    
    console.log("✅ Chief warden data update completed!");
    console.log(`📈 Stats: Updated ${updatedCount}, Created ${createdCount}, Errors ${errorCount}`);
    
    return {
      success: true,
      updated: updatedCount,
      created: createdCount,
      errors: errorCount
    };
  } catch (error) {
    console.error("❌ Error updating chief warden data:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Updates floor attendant data in Firestore
 */
async function updateFloorAttendantData() {
  try {
    console.log("🚀 Starting floor attendant data update process...");
    
    // Get reference to floor_attendants collection
    const attendantsCollection = db.collection("floor_attendants");
    
    // Get all existing floor attendants
    const existingAttendantsSnapshot = await attendantsCollection.get();
    const existingAttendantsByName = new Map();
    
    existingAttendantsSnapshot.forEach(doc => {
      const attendantData = doc.data();
      if (attendantData.fullName) {
        existingAttendantsByName.set(attendantData.fullName, doc.id);
      }
    });
    
    console.log(`📊 Found ${existingAttendantsSnapshot.size} existing floor attendant records`);
    console.log(`📊 Processing ${FloorAttendantData.length} floor attendants from JSON data`);
    
    let updatedCount = 0;
    let createdCount = 0;
    let errorCount = 0;
    
    // Process each floor attendant in the JSON data
    let batch = db.batch();
    const maxBatchSize = 500; // Firestore batch limit
    let batchCount = 0;
    let batchIndex = 0;
    
    for (const attendant of FloorAttendantData) {
      try {
        if (!attendant || !attendant.fullName) {
          console.warn("⚠️ Skipping floor attendant with missing name");
          continue;
        }
        
        const fullName = attendant.fullName;
        const docId = existingAttendantsByName.get(fullName);
        
        // Map attendant data to consistent format
        const attendantDataToStore: FloorAttendant = {
          fullName: attendant.fullName,
          email: attendant.email,
          profilePictureUrl: attendant.profilePictureUrl,
          phoneNumber: attendant.phoneNumber,
          role: attendant.role,
          assignedFloorsName: attendant.assignedFloorsName,
          assignedFloors: attendant.assignedFloors,
          reportsTo: attendant.reportsTo,
        };
        
        if (docId) {
          // Update existing attendant
          const docRef = attendantsCollection.doc(docId);
          batch.set(docRef, attendantDataToStore, { merge: true });
          updatedCount++;
        } else {
          // Create new attendant
          const docRef = attendantsCollection.doc();
          batch.set(docRef, attendantDataToStore);
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
        console.error(`❌ Error processing floor attendant ${attendant.fullName || 'unknown'}:`, error);
        errorCount++;
      }
    }
    
    // Commit any remaining changes
    if (batchCount > 0) {
      console.log(`🔄 Committing final batch...`);
      await batch.commit();
      console.log(`✅ Final batch committed successfully!`);
    }
    
    console.log("✅ Floor attendant data update completed!");
    console.log(`📈 Stats: Updated ${updatedCount}, Created ${createdCount}, Errors ${errorCount}`);
    
    return {
      success: true,
      updated: updatedCount,
      created: createdCount,
      errors: errorCount
    };
  } catch (error) {
    console.error("❌ Error updating floor attendant data:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Updates hostel warden data in Firestore
 */
async function updateHostelWardenData() {
  try {
    console.log("🚀 Starting hostel warden data update process...");
    
    // Get reference to hostel_wardens collection
    const wardensCollection = db.collection("hostel_wardens");
    
    // Get all existing hostel wardens
    const existingWardensSnapshot = await wardensCollection.get();
    const existingWardensByName = new Map();
    
    existingWardensSnapshot.forEach(doc => {
      const wardenData = doc.data();
      if (wardenData.fullName) {
        existingWardensByName.set(wardenData.fullName, doc.id);
      }
    });
    
    console.log(`📊 Found ${existingWardensSnapshot.size} existing hostel warden records`);
    console.log(`📊 Processing ${HostelWardenData.length} hostel wardens from JSON data`);
    
    let updatedCount = 0;
    let createdCount = 0;
    let errorCount = 0;
    
    // Process each hostel warden in the JSON data
    let batch = db.batch();
    const maxBatchSize = 500; // Firestore batch limit
    let batchCount = 0;
    let batchIndex = 0;
    
    for (const warden of HostelWardenData) {
      try {
        if (!warden || !warden.fullName) {
          console.warn("⚠️ Skipping hostel warden with missing name");
          continue;
        }
        
        const fullName = warden.fullName;
        const docId = existingWardensByName.get(fullName);
        
        // Map warden data to consistent format
        const wardenDataToStore: HostelWarden = {
          fullName: warden.fullName,
          email: warden.email,
          profilePictureUrl: warden.profilePictureUrl,
          phoneNumber: warden.phoneNumber,
          role: warden.role,
          assignedHostel: warden.assignedHostel,
          reportsTo: warden.reportsTo,
        };
        
        if (docId) {
          // Update existing warden
          const docRef = wardensCollection.doc(docId);
          batch.set(docRef, wardenDataToStore, { merge: true });
          updatedCount++;
        } else {
          // Create new warden
          const docRef = wardensCollection.doc();
          batch.set(docRef, wardenDataToStore);
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
        console.error(`❌ Error processing hostel warden ${warden.fullName || 'unknown'}:`, error);
        errorCount++;
      }
    }
    
    // Commit any remaining changes
    if (batchCount > 0) {
      console.log(`🔄 Committing final batch...`);
      await batch.commit();
      console.log(`✅ Final batch committed successfully!`);
    }
    
    console.log("✅ Hostel warden data update completed!");
    console.log(`📈 Stats: Updated ${updatedCount}, Created ${createdCount}, Errors ${errorCount}`);
    
    return {
      success: true,
      updated: updatedCount,
      created: createdCount,
      errors: errorCount
    };
  } catch (error) {
    console.error("❌ Error updating hostel warden data:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Updates all staff data in Firestore
 */
async function updateAllStaffData() {
  console.log("🏁 Starting staff data update process...");
  
  // Update chief wardens
  console.log("⏳ Updating chief wardens...");
  const chiefWardenResult = await updateChiefWardenData();
  console.log("Chief warden update result:", chiefWardenResult);
  
  // Update floor attendants
  console.log("⏳ Updating floor attendants...");
  const floorAttendantResult = await updateFloorAttendantData();
  console.log("Floor attendant update result:", floorAttendantResult);
  
  // Update hostel wardens
  console.log("⏳ Updating hostel wardens...");
  const hostelWardenResult = await updateHostelWardenData();
  console.log("Hostel warden update result:", hostelWardenResult);
  
  console.log("🎉 All staff data updates completed!");
  
  return {
    chiefWardenResult,
    floorAttendantResult,
    hostelWardenResult
  };
}

// Execute the update
updateAllStaffData().then((results) => {
  console.log("All operations completed with results:", results);
  process.exit(0);
}).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
