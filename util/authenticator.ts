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
      console.log(`👥 Processing ${role}...`);
      const snapshot = await db.collection(role).get();
      
      for (const doc of snapshot.docs) {
        const userData = doc.data() as User;
        
        if (!userData.email) {
          console.warn(`⚠️ User ${doc.id} has no email. Skipping...`);
          continue;
        }
        
        if (!userData.phoneNumber) {
          console.warn(`⚠️ User ${doc.id} has no phone number. Skipping...`);
          continue;
        }
        
        try {
          // Check if user already exists
          try {
            await auth.getUserByEmail(userData.email);
            console.log(`ℹ️ User ${userData.email} already exists. Updating...`);
            
            // Update user
            const userRecord = await auth.getUserByEmail(userData.email);
            await auth.updateUser(userRecord.uid, {
              email: userData.email,
              password: userData.phoneNumber.replace(/[+\s-]/g, ''), // Remove special chars from phone
              displayName: doc.data().fullName || doc.id,
            });
            
            // Set custom claims for role-based access
            await auth.setCustomUserClaims(userRecord.uid, { 
              role: userData.role,
              id: doc.id
            });
            
            console.log(`✅ Updated user ${userData.email} with role ${userData.role}`);
          } catch (error) {
            // User doesn't exist, create new one
            if ((error as any).code === 'auth/user-not-found') {
              const userRecord = await auth.createUser({
                email: userData.email,
                password: userData.phoneNumber.replace(/[+\s-]/g, ''), // Remove special chars from phone
                displayName: doc.data().fullName || doc.id,
              });
              
              // Set custom claims for role-based access
              await auth.setCustomUserClaims(userRecord.uid, { 
                role: userData.role,
                id: doc.id
              });
              
              console.log(`✅ Created user ${userData.email} with role ${userData.role}`);
            } else {
              throw error;
            }
          }
        } catch (error) {
          console.error(`❌ Error processing user ${doc.id}:`, error);
        }
      }
    }
    
    // Process students
    console.log("👨‍🎓 Processing students...");
    const studentsSnapshot = await db.collection("students").get();
    
    for (const doc of studentsSnapshot.docs) {
      const studentData = doc.data() as Student;
      
      if (!studentData.email) {
        console.warn(`⚠️ Student ${doc.id} has no email. Skipping...`);
        continue;
      }
      
      if (!studentData.registrationNumber) {
        console.warn(`⚠️ Student ${doc.id} has no registration number. Skipping...`);
        continue;
      }
      
      try {
        // Check if user already exists
        try {
          await auth.getUserByEmail(studentData.email);
          console.log(`ℹ️ Student ${studentData.email} already exists. Updating...`);
          
          // Update user
          const userRecord = await auth.getUserByEmail(studentData.email);
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
          
          console.log(`✅ Updated student ${studentData.email}`);
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
            
            console.log(`✅ Created student ${studentData.email}`);
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.error(`❌ Error processing student ${doc.id}:`, error);
      }
    }
    
    console.log("🎉 Authentication setup completed!");
  } catch (error) {
    console.error("❌ Error setting up authentication:", error);
  }
}

// Run the authentication setup
setupAuthentication();