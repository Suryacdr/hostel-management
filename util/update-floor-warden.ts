import FloorWardenData from "./floor_warden.json";
import admin from "firebase-admin";

const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

// Define interface for floor warden data
interface FloorWarden {
  fullName: string;
  phoneNumber: string[];
  email: string;
  profilePictureUrl: string;
  role: string;
  assignedHostel: string;
  assignedFloors: string[];
  assignedLevel: string;
  department: string;
  reportsTo: string;
}

/**
 * Updates the floor warden data in Firestore with data from floor_warden.json
 */
async function updateFloorWardenData() {
  try {
    console.log("🚀 Starting floor warden data update process...");
    
    // Get reference to floor_wardens collection
    const wardensCollection = db.collection("floor_wardens");
    
    // Get all existing floor wardens to find which ones to update
    const existingWardensSnapshot = await wardensCollection.get();
    const existingWardensByName = new Map();
    
    existingWardensSnapshot.forEach(doc => {
      const wardenData = doc.data();
      if (wardenData.fullName) {
        existingWardensByName.set(wardenData.fullName, doc.id);
      }
    });
    
    console.log(`📊 Found ${existingWardensSnapshot.size} existing floor warden records`);
    console.log(`📊 Processing ${FloorWardenData.length} floor wardens from JSON data`);
    
    let updatedCount = 0;
    let createdCount = 0;
    let errorCount = 0;
    
    // Process each floor warden in the JSON data
    let batch = db.batch();
    const maxBatchSize = 500; // Firestore batch limit
    let batchCount = 0;
    let batchIndex = 0;
    
    for (const warden of FloorWardenData) {
      try {
        if (!warden || !warden.fullName) {
          console.warn("⚠️ Skipping floor warden with missing name");
          continue;
        }
        
        const fullName = warden.fullName;
        const docId = existingWardensByName.get(fullName);
        
        // Map warden data to consistent format
        const wardenDataToStore: FloorWarden = {
          fullName: warden.fullName,
          phoneNumber: warden.phoneNumber,
          role: warden.role,
          email: warden.email,
          profilePictureUrl: warden.profilePictureUrl,
          assignedHostel: warden.assignedHostel,
          assignedFloors: warden.assignedFloors,
          assignedLevel: warden.assignedLevel,
          department: warden.department,
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
        console.error(`❌ Error processing floor warden ${warden.fullName || 'unknown'}:`, error);
        errorCount++;
      }
    }
    
    // Commit any remaining changes
    if (batchCount > 0) {
      console.log(`🔄 Committing final batch...`);
      await batch.commit();
      console.log(`✅ Final batch committed successfully!`);
    }
    
    console.log("✅ Floor warden data update completed!");
    console.log(`📈 Stats: Updated ${updatedCount}, Created ${createdCount}, Errors ${errorCount}`);
    
    return {
      success: true,
      updated: updatedCount,
      created: createdCount,
      errors: errorCount
    };
  } catch (error) {
    console.error("❌ Error updating floor warden data:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

// Execute the update
updateFloorWardenData().then((result) => {
  console.log("Operation completed with result:", result);
}).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});