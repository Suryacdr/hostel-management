import { db, auth } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import hostelJsonData from './hostel_data.json';

// Define types for the data structure
interface UserData {
    fullName: string;
    email: string;
    phoneNumber: string;
    role: string;
    profilePictureUrl: string;
    [key: string]: any; // For other properties that vary by role
}

interface FloorData {
    floorWarden: string;
    floorAttendant: string;
    rooms: string[];
    [key: string]: any;
}

interface HostelData {
    name: string;
    warden: string;
    supervisor: string;
    totalFloors: number;
    totalRooms: number;
    floors: {
        [key: string]: FloorData;
    };
    [key: string]: any;
}

interface StudentData {
    fullName: string;
    email: string;
    phoneNumber: string;
    roommateDetails?: {
        roommateId: string;
        roommateName: string;
    };
    [key: string]: any;
}

interface RoleCategory {
    role: string;
    data: {
        [key: string]: UserData | StudentData;
    };
}

interface IdMapping {
    [key: string]: string;
}

/**
 * Updates Firestore database to use Firebase UIDs as document IDs
 * instead of custom IDs from the hostel_data.json file
 */
export async function updateFirestoreWithUIDs() {
    try {
        // Create a batch for efficient writes
        const batch = writeBatch(db);
        
        // Process users by role category
        const roleCategories: RoleCategory[] = [
            { role: 'chief_warden', data: hostelJsonData.roles.chief_warden },
            { role: 'supervisor', data: hostelJsonData.roles.supervisors },
            { role: 'hostel_warden', data: hostelJsonData.roles.hostel_wardens },
            { role: 'floor_warden', data: hostelJsonData.roles.floor_wardens },
            { role: 'floor_attendant', data: hostelJsonData.roles.floor_attendants },
            { role: 'student', data: hostelJsonData.students }
        ];

        // Mapping of custom IDs to generated UIDs
        const idMapping: IdMapping = {};

        // Process each role category
        for (const category of roleCategories) {
            console.log(`Processing ${category.role} users...`);
            
            for (const [customId, userData] of Object.entries(category.data)) {
                try {
                    // Create Firebase auth account and get UID
                    // Using a default password "ChangeMe123!" that users should change after first login
                    const email = userData.email;
                    const userCredential = await createUserWithEmailAndPassword(auth, email, "ChangeMe123!");
                    const uid = userCredential.user.uid;
                    
                    // Store mapping of custom ID to UID
                    idMapping[customId] = uid;
                    
                    // Prepare user data (without the custom ID) for Firestore
                    const userDataToStore = {
                        ...userData,
                        uid: uid,
                        customId: customId // Keep reference to the original custom ID
                    };
                    
                    // Add to Firestore using UID as document ID
                    const userRef = doc(db, 'users', uid);
                    batch.set(userRef, userDataToStore);
                    
                    // Add to role-specific collection too
                    const roleRef = doc(db, category.role, uid);
                    batch.set(roleRef, userDataToStore);
                    
                    console.log(`Created user with email: ${email}, UID: ${uid}, custom ID: ${customId}`);
                } catch (error: any) {
                    console.error(`Error creating user for ${customId}:`, error.message);
                    // If the error is about existing email, we could add code to retrieve the UID for existing users
                }
            }
        }
        
        // Process hostels collection
        for (const [hostelId, hostelDataItem] of Object.entries<HostelData>(hostelJsonData.hostels)) {
            const hostelRef = doc(db, 'hostels', hostelId);
            
            // Update references to users with their UIDs
            const hostelDataToStore = {
                ...hostelDataItem,
                warden: idMapping[hostelDataItem.warden] || hostelDataItem.warden,
                supervisor: idMapping[hostelDataItem.supervisor] || hostelDataItem.supervisor
            };
            
            // Update floor wardens and attendants references
            for (const [floorNum, floorData] of Object.entries<FloorData>(hostelDataToStore.floors)) {
                hostelDataToStore.floors[floorNum] = {
                    ...floorData,
                    floorWarden: idMapping[floorData.floorWarden] || floorData.floorWarden,
                    floorAttendant: idMapping[floorData.floorAttendant] || floorData.floorAttendant
                };
            }
            
            batch.set(hostelRef, hostelDataToStore);
        }
        
        // Update student hostel assignments and roommate references
        for (const [customId, studentData] of Object.entries<StudentData>(hostelJsonData.students)) {
            if (idMapping[customId]) {
                const uid = idMapping[customId];
                const studentRef = doc(db, 'students', uid);
                
                // Get the data already set in the batch
                const updatedStudentData = {
                    ...studentData,
                    uid: uid,
                    customId: customId
                };
                
                // Update roommate reference with UID
                if (studentData.roommateDetails && studentData.roommateDetails.roommateId) {
                    updatedStudentData.roommateDetails = {
                        ...studentData.roommateDetails,
                        roommateId: idMapping[studentData.roommateDetails.roommateId] || studentData.roommateDetails.roommateId
                    };
                }
                
                batch.set(studentRef, updatedStudentData);
            }
        }
        
        // Commit all the batch operations
        await batch.commit();
        console.log('Firebase database successfully updated with UID-based document IDs');
        
        return { success: true, message: 'Database updated successfully', idMapping };
    } catch (error: any) {
        console.error('Error updating Firestore with UIDs:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Retrieves the ID mapping between custom IDs and Firebase UIDs
 * @returns {Object} Mapping of custom IDs to UIDs
 */
export async function getIdMapping(): Promise<IdMapping> {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const mapping: IdMapping = {};
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.customId) {
                mapping[userData.customId] = doc.id;
            }
        });
        
        return mapping;
    } catch (error: any) {
        console.error('Error retrieving ID mapping:', error);
        return {};
    }
}

/**
 * Helper function to convert existing data to use UIDs
 * @param {string} customId - The custom ID from hostel_data.json
 * @returns {Promise<string>} The corresponding UID or the original customId if not found
 */
export async function getUidFromCustomId(customId: string): Promise<string> {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('customId', '==', customId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].id;
        }
        
        return customId; // Return original ID if no mapping found
    } catch (error: any) {
        console.error('Error getting UID from custom ID:', error);
        return customId;
    }
}