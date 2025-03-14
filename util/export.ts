import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function exportFirestore() {
    try {
        console.log("🔍 Starting Firestore export...");
        const collections = await db.listCollections();
        const firestoreData: Record<string, Record<string, any>> = {};

        // Process each top-level collection
        for (const collection of collections) {
            console.log(`📁 Processing collection: ${collection.id}`);
            firestoreData[collection.id] = {};
            
            const snapshot = await collection.get();
            
            // Process each document in the collection
            for (const doc of snapshot.docs) {
                firestoreData[collection.id][doc.id] = doc.data();
                
                // Check for subcollections
                const subCollections = await doc.ref.listCollections();
                
                if (subCollections.length > 0) {
                    firestoreData[collection.id][doc.id]['_subcollections'] = {};
                    
                    // Process each subcollection
                    for (const subCollection of subCollections) {
                        console.log(`  📂 Processing subcollection: ${collection.id}/${doc.id}/${subCollection.id}`);
                        firestoreData[collection.id][doc.id]['_subcollections'][subCollection.id] = {};
                        
                        const subSnapshot = await subCollection.get();
                        
                        // Process each document in the subcollection
                        subSnapshot.forEach((subDoc) => {
                            firestoreData[collection.id][doc.id]['_subcollections'][subCollection.id][subDoc.id] = subDoc.data();
                        });
                    }
                }
            }
        }

        // Create output directory if it doesn't exist
        const outputDir = path.join(__dirname, '../backups');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        // Generate timestamp for the filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputPath = path.join(outputDir, `firestore_backup_${timestamp}.json`);
        
        // Write the data to a file
        fs.writeFileSync(outputPath, JSON.stringify(firestoreData, null, 2));
        console.log(`✅ Firestore data exported to ${outputPath}`);
        
        // Also create a latest backup
        const latestPath = path.join(outputDir, 'firestore_backup_latest.json');
        fs.writeFileSync(latestPath, JSON.stringify(firestoreData, null, 2));
        console.log(`✅ Latest backup saved to ${latestPath}`);
    } catch (error) {
        console.error("❌ Error exporting Firestore:", error);
    }
}

exportFirestore();
