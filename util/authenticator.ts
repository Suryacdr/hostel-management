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

interface User {
  email: string;
  phoneNumber?: string;
  role: string;
}

interface Student extends User {
  registrationNumber: number;
}

async function setupAuthentication() {
  try {
    console.log("🔐 Starting authentication setup...");
    
    // Only process floor wardens
    const roles = ["floor_wardens"];
    
    // Process floor wardens only
    for (const role of roles) {
      console.log(`👥 Processing ${role} collection...`);
      const snapshot = await db.collection(role).get();
      let processed = 0, skipped = 0, updated = 0, created = 0;
      
      for (const doc of snapshot.docs) {
        const userData = doc.data() as User;
        
        if (!userData.email || !userData.phoneNumber) {
          skipped++;
          continue;
        }
        
        // Generate a valid password from phone number
        const phoneStr = Array.isArray(userData.phoneNumber) ? 
          userData.phoneNumber[0] : userData.phoneNumber;
        // Ensure password is at least 6 characters
        const password = phoneStr.length >= 6 ? 
          phoneStr : phoneStr.padEnd(6, phoneStr[0] || '0');
        
        try {
          // Check if user already exists
          try {
            const userRecord = await auth.getUserByEmail(userData.email);
            
            // Update user
            await auth.updateUser(userRecord.uid, {
              email: userData.email,
              password: password,
              displayName: doc.data().fullName || doc.id,
            });
            
            // Set custom claims for role-based access
            await auth.setCustomUserClaims(userRecord.uid, { 
              role: userData.role,
              id: doc.id
            });
            updated++;
          } catch (error) {
            // User doesn't exist, create new one
            if ((error as any).code === 'auth/user-not-found') {
              const userRecord = await auth.createUser({
                email: userData.email,
                password: password,
                displayName: doc.data().fullName || doc.id,
              });
              
              // Set custom claims for role-based access
              await auth.setCustomUserClaims(userRecord.uid, { 
                role: userData.role,
                id: doc.id
              });
              created++;
            } else {
              throw error;
            }
          }
          processed++;
        } catch (error) {
          console.error(`Error processing user ${doc.id}:`, error);
          skipped++;
        }
      }
      console.log(`✅ ${role}: ${processed} processed (${created} created, ${updated} updated), ${skipped} skipped`);
    }
    
    console.log("🎉 Authentication setup completed for floor wardens only!");
  } catch (error) {
    console.error("❌ Error setting up authentication:", error);
  }
}

// Run the authentication setup
setupAuthentication();