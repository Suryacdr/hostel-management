import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

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
    
    // Get all users from different role collections
    const roles = [
      "chief_warden", 
      "supervisors", 
      "hostel_wardens", 
      "floor_wardens", 
      "floor_attendants"
    ];
    
    // Process staff roles (non-students)
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
        
        try {
          // Check if user already exists
          try {
            const userRecord = await auth.getUserByEmail(userData.email);
            
            // Update user
            await auth.updateUser(userRecord.uid, {
              email: userData.email,
              password: userData.phoneNumber.replace(/[+\s-]/g, ''),
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
                password: userData.phoneNumber.replace(/[+\s-]/g, ''),
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
    
    // Process students
    console.log("👨‍🎓 Processing students collection...");
    const studentsSnapshot = await db.collection("students").get();
    let processed = 0, skipped = 0, updated = 0, created = 0;
    
    for (const doc of studentsSnapshot.docs) {
      const studentData = doc.data() as Student;
      
      if (!studentData.email || !studentData.registrationNumber) {
        skipped++;
        continue;
      }
      
      try {
        // Check if user already exists
        try {
          const userRecord = await auth.getUserByEmail(studentData.email);
          
          // Update user
          await auth.updateUser(userRecord.uid, {
            email: studentData.email,
            password: studentData.registrationNumber.toString(),
            displayName: doc.data().fullName || doc.id,
          });
          
          // Set custom claims for role-based access
          await auth.setCustomUserClaims(userRecord.uid, { 
            role: 'student',
            id: doc.id
          });
          updated++;
        } catch (error) {
          // User doesn't exist, create new one
          if ((error as any).code === 'auth/user-not-found') {
            const userRecord = await auth.createUser({
              email: studentData.email,
              password: studentData.registrationNumber.toString(),
              displayName: doc.data().fullName || doc.id,
            });
            
            // Set custom claims for role-based access
            await auth.setCustomUserClaims(userRecord.uid, { 
              role: 'student',
              id: doc.id
            });
            created++;
          } else {
            throw error;
          }
        }
        processed++;
      } catch (error) {
        console.error(`Error processing student ${doc.id}:`, error);
        skipped++;
      }
    }
    console.log(`✅ Students: ${processed} processed (${created} created, ${updated} updated), ${skipped} skipped`);
    
    console.log("🎉 Authentication setup completed!");
  } catch (error) {
    console.error("❌ Error setting up authentication:", error);
  }
}

// Run the authentication setup
setupAuthentication();