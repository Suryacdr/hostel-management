import ChiefWardenData from "./chief_warden.json";
import FloorAttendantData from "./floor-attendant.json";
import HostelWardenData from "./hostel-warden.json";
import admin from "firebase-admin";

// Initialize Firebase Admin if not already initialized
const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const auth = admin.auth();

// Staff interfaces
interface StaffMember {
  fullName: string;
  email: string;
  phoneNumber: string[];
  role: string;
  reportsTo: string;
}

interface ChiefWarden extends StaffMember {
  assignedHostel: string[];
}

interface HostelWarden extends StaffMember {
  assignedHostel: string[];
}

interface FloorAttendant extends StaffMember {
  assignedFloorsName: string[];
  assignedFloors: string[];
}

/**
 * Generates a valid password from a phone number
 */
function generatePassword(phoneNumber: string | string[]): string {
  // Handle empty array case explicitly
  if (Array.isArray(phoneNumber) && phoneNumber.length === 0) {
    return "password123";
  }
  
  const phone = Array.isArray(phoneNumber) ? phoneNumber[0] : phoneNumber;
  
  if (!phone || phone.trim() === "") {
    return "password123";
  }
  
  // Use phone number directly as password
  return phone;
}

/**
 * Creates or updates a user in Firebase Authentication
 */
async function setupUserAuth(userData: StaffMember, id: string): Promise<{ status: string, uid?: string }> {
  if (!userData.email) {
    return { status: "skipped-no-email" };
  }
  
  const password = generatePassword(userData.phoneNumber);
  
  try {
    // Check if user already exists
    try {
      const userRecord = await auth.getUserByEmail(userData.email);
      
      // Update existing user
      await auth.updateUser(userRecord.uid, {
        email: userData.email,
        password: password,
        displayName: userData.fullName || id,
      });
      
      // Set custom claims for role-based access
      await auth.setCustomUserClaims(userRecord.uid, { 
        role: userData.role,
        id: id
      });
      
      return { status: "updated", uid: userRecord.uid };
    } catch (error) {
      // User doesn't exist, create new one
      if ((error as any).code === 'auth/user-not-found') {
        const userRecord = await auth.createUser({
          email: userData.email,
          password: password,
          displayName: userData.fullName || id,
        });
        
        // Set custom claims for role-based access
        await auth.setCustomUserClaims(userRecord.uid, { 
          role: userData.role,
          id: id
        });
        
        return { status: "created", uid: userRecord.uid };
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error(`Error processing user ${userData.fullName}:`, error);
    return { status: "error" };
  }
}

/**
 * Process a collection of staff members
 */
async function processStaffCollection<T extends StaffMember>(
  staff: T[], 
  role: string, 
  collection: string
): Promise<{ processed: number, created: number, updated: number, skipped: number }> {
  console.log(`👥 Processing ${role} collection...`);
  
  let processed = 0, created = 0, updated = 0, skipped = 0;
  
  // Get reference to collection
  const staffCollection = db.collection(collection);
  
  // Get all existing staff members
  const existingSnapshot = await staffCollection.get();
  const existingByEmail = new Map();
  
  existingSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.email) {
      existingByEmail.set(data.email, doc.id);
    }
  });
  
  // Process each staff member
  for (const member of staff) {
    if (!member.email) {
      console.warn(`⚠️ Skipping ${role} with missing email`);
      skipped++;
      continue;
    }
    
    // Get document ID if exists, or generate a new one
    const docId = existingByEmail.get(member.email) || staffCollection.doc().id;
    
    // Set up authentication
    const authResult = await setupUserAuth(member, docId);
    
    switch (authResult.status) {
      case "created":
        created++;
        processed++;
        break;
      case "updated":
        updated++;
        processed++;
        break;
      case "skipped-no-email":
      case "error":
        skipped++;
        break;
    }
    
    // Also update the Firestore document with the updated credentials info
    if (authResult.status === "created" || authResult.status === "updated") {
      try {
        await staffCollection.doc(docId).set({
          ...member,
          uid: authResult.uid,
          passwordResetRequired: true, // Force password reset on next login
          lastAuthUpdate: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error(`Error updating Firestore for ${member.fullName}:`, error);
      }
    }
  }
  
  console.log(`✅ ${role}: ${processed} processed (${created} created, ${updated} updated), ${skipped} skipped`);
  return { processed, created, updated, skipped };
}

/**
 * Sets up authentication for all staff types
 */
async function setupStaffAuthentication() {
  try {
    console.log("🔐 Starting staff authentication setup...");
    
    // Process chief wardens
    const chiefWardenResults = await processStaffCollection<ChiefWarden>(
      ChiefWardenData, 
      "chief wardens", 
      "chief_wardens"
    );
    
    // Process hostel wardens
    const hostelWardenResults = await processStaffCollection<HostelWarden>(
      HostelWardenData, 
      "hostel wardens", 
      "hostel_wardens"
    );
    
    // Process floor attendants
    const floorAttendantResults = await processStaffCollection<FloorAttendant>(
      FloorAttendantData, 
      "floor attendants", 
      "floor_attendants"
    );
    
    // Report overall statistics
    const totalProcessed = chiefWardenResults.processed + hostelWardenResults.processed + floorAttendantResults.processed;
    const totalCreated = chiefWardenResults.created + hostelWardenResults.created + floorAttendantResults.created;
    const totalUpdated = chiefWardenResults.updated + hostelWardenResults.updated + floorAttendantResults.updated;
    const totalSkipped = chiefWardenResults.skipped + hostelWardenResults.skipped + floorAttendantResults.skipped;
    
    console.log("🎉 Authentication setup completed!");
    console.log(`📊 Overall: ${totalProcessed} processed (${totalCreated} created, ${totalUpdated} updated), ${totalSkipped} skipped`);
    
  } catch (error) {
    console.error("❌ Error setting up staff authentication:", error);
  }
}

// Run the authentication setup
setupStaffAuthentication().then(() => {
  console.log("Staff login setup complete.");
  process.exit(0);
}).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
