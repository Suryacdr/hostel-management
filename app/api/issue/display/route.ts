import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = require("@/serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = getFirestore();

export async function GET(request: NextRequest) {
    try {
        const studentsSnapshot = await db.collection("students").get();
        const maintenanceIssues: any[] = [];

        studentsSnapshot.forEach(doc => {
            const data = doc.data();
            // Normalize fields
            const studentName = data.fullName || data.name || "Unknown Student";
            const studentEmail = data.email || "";
            const studentRoom =
                data.hostelDetails?.roomNumber ||
                data.room ||
                "";
            const hostel =
                data.hostelDetails?.hostel ||
                data.hostel ||
                "";

            if (Array.isArray(data.issues)) {
                data.issues.forEach((issue: any) => {
                    if (issue.type === "maintenance") {
                        maintenanceIssues.push({
                            ...issue,
                            studentId: doc.id,
                            studentName,
                            studentEmail,
                            studentRoom,
                            hostel,
                            // fallback for missing fields
                            floor: data.hostelDetails?.floor || data.floor || "",
                        });
                    }
                });
            }
        });

        return NextResponse.json({ maintenanceIssues }, { status: 200 });
    } catch (error) {
        console.error("Error fetching maintenance issues:", error instanceof Error ? error.message : "Unknown error");
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
