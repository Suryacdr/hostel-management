import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin if it hasn't been initialized yet
const serviceAccount = require("@/serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = getFirestore();
const auth = getAuth();

export async function POST(request: NextRequest) {
  try {
    console.log("Incoming request received");

    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing or invalid token" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    if (!uid) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid user, missing UID" },
        { status: 401 }
      );
    }

    const userRecord = await auth.getUser(uid);
    console.log("User authenticated:", uid, "Email:", userRecord.email);

    // Get and parse request body safely
    let body;
    try {
      const rawBody = await request.text();
      body = rawBody ? JSON.parse(rawBody) : null;
      console.log("Parsed request body:", body);
    } catch (e) {
      console.error("Error parsing request body:", e);
      return NextResponse.json(
        { error: "Invalid request body format" },
        { status: 400 }
      );
    }

    const { content, tag } = body || {};

    if (!content || !tag) {
      return NextResponse.json(
        { error: "Missing required fields: content and tag are required" },
        { status: 400 }
      );
    }

    if (tag !== "Complaint" && tag !== "Maintenance") {
      return NextResponse.json(
        { error: "Invalid tag value. Must be 'Complaint' or 'Maintenance'" },
        { status: 400 }
      );
    }

    let studentSnapshot = await db.collection("students").where("uid", "==", uid).get();
    if (studentSnapshot.empty && userRecord.email) {
      studentSnapshot = await db.collection("students").where("email", "==", userRecord.email).get();
    }

    let studentDoc;
    let studentData;
    let studentId = uid;

    if (studentSnapshot.empty) {
      studentData = {
        uid,
        email: userRecord.email,
        name: userRecord.displayName || "Student",
        id: userRecord.uid.substring(0, 8).toUpperCase(),
        course: "Not set",
        department: "Not set",
        room: "Not assigned",
        profilePictureUrl: userRecord.photoURL || "",
        complaints: [],
        maintenance: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection("students").doc(studentId).set(studentData);
    } else {
      studentDoc = studentSnapshot.docs[0];
      studentData = studentDoc.data();
      studentId = studentDoc.id;
    }

    const postId = Date.now();
    const postData = {
      id: postId,
      message: content,
      tag,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      author: studentData.name || userRecord.displayName || "Unknown",
      authorId: uid,
      likes: 0,
      solved: false,
    };

    if (!postData || typeof postData !== "object") {
      return NextResponse.json(
        { error: "Failed to create post: postData is invalid" },
        { status: 500 }
      );
    }

    // Ensure complaints or maintenance array exists before updating
    const updateField = tag === "Complaint" ? "complaints" : "maintenance";
    await db.collection("students").doc(studentId).set(
      {
        [updateField]: admin.firestore.FieldValue.arrayUnion(postData),
      },
      { merge: true }
    );

    return NextResponse.json(
      { message: "Post created successfully", postId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating post:", error ? error : "Unknown error");
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
