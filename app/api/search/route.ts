import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import admin from "firebase-admin";

if (!admin.apps.length) {
    const serviceAccount = require("@/serviceAccountKey.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Unauthorized: Missing or invalid token" },
                { status: 401 }
            );
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await getAuth().verifyIdToken(token);
        const userRecord = await getAuth().getUser(decodedToken.uid);
        const role = userRecord.customClaims?.role || decodedToken.role;

        if (!role) {
            return NextResponse.json(
                { error: "Unauthorized: User has no assigned role" },
                { status: 403 }
            );
        }

        const searchParams = new URL(request.url).searchParams;
        const query = searchParams.get("query")?.toLowerCase() || "";
        const filter = searchParams.get("filter") || "all";

        if (!query) {
            return NextResponse.json({ results: [] });
        }

        const db = getFirestore();
        let results: any[] = [];

        const searchInCollection = async (collectionName: string, type: string) => {
            const snapshot = await db.collection(collectionName)
                .orderBy("fullName")
                .get();

            return snapshot.docs
                .filter(doc => {
                    const data = doc.data();
                    const searchableFields = [
                        data.fullName,
                        data.email,
                        data.phoneNumber,
                        data.registrationNumber,
                        data.course,
                        data.hostelDetails?.hostel,
                        data.hostelDetails?.roomNumber,
                    ].filter(Boolean);

                    return searchableFields.some(field =>
                        field.toString().toLowerCase().includes(query)
                    );
                })
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    type
                }));
        };

        if (filter === "all" || filter === "students") {
            const studentResults = await searchInCollection("students", "Student");
            results = [...results, ...studentResults];
        }

        if (filter === "all" || filter === "supervisors") {
            const supervisorResults = await searchInCollection("supervisors", "Supervisor");
            results = [...results, ...supervisorResults];
        }

        if (filter === "all" || filter === "hostel_wardens") {
            const wardenResults = await searchInCollection("hostel_wardens", "Hostel Warden");
            results = [...results, ...wardenResults];
        }

        if (filter === "all" || filter === "floor_wardens") {
            const floorWardenResults = await searchInCollection("floor_wardens", "Floor Warden");
            results = [...results, ...floorWardenResults];
        }

        if (filter === "all" || filter === "floor_attendants") {
            const attendantResults = await searchInCollection("floor_attendants", "Floor Attendant");
            results = [...results, ...attendantResults];
        }

        if (filter === "all" || filter === "issues") {
            const issuesSnapshot = await db.collectionGroup("issues")
                .where("message", ">=", query)
                .where("message", "<=", query + "\uf8ff")
                .get();

            const issueResults = issuesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                type: "Issue"
            }));

            results = [...results, ...issueResults];
        }

        return NextResponse.json({ results });

    } catch (error) {
        console.error("Search error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}