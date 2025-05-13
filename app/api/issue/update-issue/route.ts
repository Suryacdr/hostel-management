import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin if it hasn't been initialized yet
if (!admin.apps.length) {
    try {
        const serviceAccount = require("@/serviceAccountKey.json");
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (error) {
        console.error("Firebase initialization error:", error);
    }
}

const db = getFirestore();
const auth = getAuth();

export async function PATCH(request: NextRequest) {
    try {
        // Validate authentication
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized: Missing or invalid token" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await auth.verifyIdToken(token);
        const uid = decodedToken.uid;

        if (!uid) {
            return NextResponse.json({ error: "Unauthorized: Invalid user" }, { status: 401 });
        }

        // Get user role
        const userRecord = await auth.getUser(uid);
        const role = userRecord.customClaims?.role || decodedToken.role;

        // Parse request body
        let body;
        try {
            body = await request.json();
        } catch (e) {
            console.error("Error parsing request body:", e);
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }

        const { issueId, solved } = body;

        if (!issueId) {
            return NextResponse.json({ error: "Missing required field: issueId" }, { status: 400 });
        }

        if (solved === undefined) {
            return NextResponse.json({ error: "Missing required field: solved" }, { status: 400 });
        }

        console.log(`Updating issue ${issueId} - solved status: ${solved}`);

        // Find the student document containing the issue
        let studentQuery;
        
        if (role === "student") {
            // If student, only allow updating their own issues
            studentQuery = db.collection("students").where("uid", "==", uid);
        } else {
            // For staff roles, search across all students
            // This is a suboptimal query but works for this use case
            // In production, consider adding an issueOwner field to make this more efficient
            studentQuery = db.collection("students");
        }

        const studentsSnapshot = await studentQuery.get();
        
        if (studentsSnapshot.empty) {
            return NextResponse.json({ error: "No student records found" }, { status: 404 });
        }

        let issueUpdated = false;
        let updatePromises = [];

        for (const studentDoc of studentsSnapshot.docs) {
            const studentData = studentDoc.data();
            const studentIssues = studentData.issues || [];
            
            if (!Array.isArray(studentIssues)) {
                continue;
            }
            
            const issueIndex = studentIssues.findIndex((issue: any) => issue.id === issueId);
            
            if (issueIndex !== -1) {
                // Create a new array with the updated issue
                const updatedIssues = [...studentIssues];
                
                // Update the issue
                updatedIssues[issueIndex] = {
                    ...updatedIssues[issueIndex],
                    solved: solved,
                    isSolved: solved, // For backward compatibility
                    completeDate: solved ? new Date().toISOString() : null,
                    status: solved ? "resolved" : "open"
                };
                
                // Update the student document
                updatePromises.push(
                    db.collection("students").doc(studentDoc.id).update({ issues: updatedIssues })
                );
                
                issueUpdated = true;
                break;
            }
        }

        if (!issueUpdated) {
            return NextResponse.json({ error: "Issue not found" }, { status: 404 });
        }

        await Promise.all(updatePromises);
        
        return NextResponse.json({ success: true, message: "Issue updated successfully" });
    } catch (error) {
        console.error("Error updating issue:", error);
        return NextResponse.json({ 
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
