import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin if it hasn't been initialized yet
const serviceAccount = require("@/serviceAccountKey.json");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore();
const auth = getAuth();

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing or invalid token" },
        { status: 401 }
      );
    }

    // Extract the token
    const token = authHeader.split("Bearer ")[1];

    // Verify the token and get the user
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const userRecord = await auth.getUser(uid);

    if (!uid) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid user" },
        { status: 401 }
      );
    }

    console.log("User authenticated:", uid, "Email:", userRecord.email);

    // Get request body
    const body = await request.json();
    const { content, tag } = body;

    // Validate required fields
    if (!content || !tag) {
      return NextResponse.json(
        { error: "Missing required fields: content and tag are required" },
        { status: 400 }
      );
    }

    // Validate tag value
    if (tag !== "Complaint" && tag !== "Maintenance") {
      return NextResponse.json(
        { error: "Invalid tag value. Must be 'Complaint' or 'Maintenance'" },
        { status: 400 }
      );
    }

    // Find student by UID or email
    let studentSnapshot = await db.collection("students").where("uid", "==", uid).get();
    console.log("Looking for student with uid:", uid, "Found:", !studentSnapshot.empty);
    
    if (studentSnapshot.empty && userRecord.email) {
      console.log("Trying to find student with email:", userRecord.email);
      studentSnapshot = await db.collection("students").where("email", "==", userRecord.email).get();
      console.log("Found with email:", !studentSnapshot.empty);
    }

    let studentDoc;
    let studentData;
    let studentId;

    if (studentSnapshot.empty) {
      // If still not found, let's check what students are in the database for debugging
      const allStudentsSnapshot = await db.collection("students").get();
      console.log("Total students in database:", allStudentsSnapshot.size);
      if (allStudentsSnapshot.size > 0) {
        console.log("Sample student data:", allStudentsSnapshot.docs[0].data());
      }
      
      // Instead of returning an error, create a new student document
      console.log("Creating new student document for user:", uid);
      
      // Create a minimal student record
      studentId = uid; // Use the auth UID as the document ID
      studentData = {
        uid: uid,
        email: userRecord.email,
        fullName: userRecord.displayName || "Student",
        complaints: [],
        maintenance: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Add the new student document
      await db.collection("students").doc(studentId).set(studentData);
      console.log("Created new student document with ID:", studentId);
    } else {
      studentDoc = studentSnapshot.docs[0];
      studentData = studentDoc.data();
      studentId = studentDoc.id;
      console.log("Found student:", studentId, "Name:", studentData.fullName);
    }

    // Generate a unique ID for the post
    const postId = db.collection("posts").doc().id;

    // Create post document
    const postData = {
      id: postId,
      message: content,
      tag,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      author: studentData?.fullName || "Unknown",
      authorId: uid,
      likes: 0,
      solved: false,
    };

    // Add the post to the appropriate array in the student document
    if (tag === "Complaint") {
      // Initialize the complaints array if it doesn't exist
      if (!Array.isArray(studentData.complaints)) {
        await db.collection("students").doc(studentId).update({
          complaints: []
        });
      }
      
      // Add to student's complaints array
      await db.collection("students").doc(studentId).update({
        complaints: admin.firestore.FieldValue.arrayUnion(postData)
      });
      console.log("Added complaint to student document");
    } else if (tag === "Maintenance") {
      // Initialize the maintenance array if it doesn't exist
      if (!Array.isArray(studentData.maintenance)) {
        await db.collection("students").doc(studentId).update({
          maintenance: []
        });
      }
      
      // Add to student's maintenance array
      await db.collection("students").doc(studentId).update({
        maintenance: admin.firestore.FieldValue.arrayUnion(postData)
      });
      console.log("Added maintenance request to student document");
    }

    return NextResponse.json(
      {
        message: "Post created successfully",
        postId: postId
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
