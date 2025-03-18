import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

// Initialize Firebase Admin if it hasn't been initialized yet
const serviceAccount = require("@/serviceAccountKey.json");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}


const db = admin.firestore();
const auth = admin.auth();

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
    const userId = decodedToken.uid;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid user" },
        { status: 401 }
      );
    }

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

    // Get user info for the post
    const userDoc = await db.collection("students").doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Create post document
    const postData = {
      content,
      tag,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      author: userData?.name || "Unknown",
      authorId: userId,
      likes: 0,
      solved: false,
    };

    // Add post to the posts collection
    const postRef = await db.collection("posts").add(postData);

    // Also add reference to user's posts array
    await db.collection("students").doc(userId).update({
      posts: admin.firestore.FieldValue.arrayUnion(postRef.id),
    });

    return NextResponse.json(
      {
        message: "Post created successfully",
        postId: postRef.id
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
