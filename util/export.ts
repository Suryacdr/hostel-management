import admin from "firebase-admin";
import * as fs from "fs";

const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function exportFirestore() {
    try {
        const collections = await db.listCollections();
        const firestoreData: Record<string, Record<string, any>> = {};

        for (const collection of collections) {
            const snapshot = await collection.get();
            firestoreData[collection.id] = {};

            snapshot.forEach((doc) => {
                firestoreData[collection.id][doc.id] = doc.data();
            });
        }

        fs.writeFileSync("firestore_backup.json", JSON.stringify(firestoreData, null, 2));
        console.log("✅ Firestore data exported to firestore_backup.json");
    } catch (error) {
        console.error("❌ Error exporting Firestore:", error);
    }
}

exportFirestore();
