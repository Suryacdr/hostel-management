import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Query, DocumentData } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin if not already initialized
const admin = (() => {
  if (!getApps().length) {
    try {
      let serviceAccount;
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } else {
        try {
          serviceAccount = require('../../../../serviceAccountKey.json');
        } catch (e) {
          console.error("Could not load service account from file:", e);
        }
      }

      return initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error) {
      console.error("Firebase Admin initialization error:", error);
      throw new Error("Firebase Admin failed to initialize");
    }
  }
  return getApps()[0];
})();

const adminDb = getFirestore(admin);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const limitParam = parseInt(searchParams.get('limit') || '50', 10);
  
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid authorization token', maintenanceIssues: [] },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    const decodedToken = await getAuth(admin).verifyIdToken(token);
    const userId = decodedToken.uid;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User ID not found in token', maintenanceIssues: [] },
        { status: 401 }
      );
    }

    const allIssues = [];
    
    // PART 1: Fetch from maintenance_issues collection
    try {
      const issuesRef = adminDb.collection('maintenance_issues');
      
      let issuesQuery: Query<DocumentData> = issuesRef.where('userId', '==', userId);
      
      if (status === 'pending') {
        issuesQuery = issuesQuery.where('solved', '==', false);
      } else if (status === 'solved') {
        issuesQuery = issuesQuery.where('solved', '==', true);
      }
      
      if (type) {
        issuesQuery = issuesQuery.where('type', '==', type);
      }
      
      issuesQuery = issuesQuery.orderBy('timestamp', 'desc');
      issuesQuery = issuesQuery.limit(limitParam);
      
      const issuesSnapshot = await issuesQuery.get();
      
      const collectionIssues = issuesSnapshot.docs.map(doc => {
        const data = doc.data();
        let timestamp;
        try {
          timestamp = data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString();
        } catch (e) {
          timestamp = new Date().toISOString();
        }
        
        return {
          id: doc.id,
          ...data,
          timestamp,
          source: 'maintenance_collection'
        };
      });
      
      allIssues.push(...collectionIssues);
    } catch (err) {
      console.warn('Error fetching from maintenance_issues collection:', err);
    }
    
    // PART 2: Fetch from student document's issues array
    try {
      const studentQuery = adminDb.collection('students').where('uid', '==', userId);
      const studentSnapshot = await studentQuery.get();
      
      if (!studentSnapshot.empty) {
        const studentDoc = studentSnapshot.docs[0];
        const studentData = studentDoc.data();
        
        if (Array.isArray(studentData.issues) && studentData.issues.length > 0) {
          let studentIssues = studentData.issues;
          
          if (status === 'pending') {
            studentIssues = studentIssues.filter(issue => !issue.solved && !issue.isSolved);
          } else if (status === 'solved') {
            studentIssues = studentIssues.filter(issue => issue.solved || issue.isSolved);
          }
          
          if (type) {
            studentIssues = studentIssues.filter(issue => 
              issue.type?.toLowerCase() === type.toLowerCase()
            );
          }
          
          const processedIssues = studentIssues.map(issue => {
            const hostelId = 
              issue.hostelId || 
              issue.hostelDetails?.hostelId || 
              studentData.hostelDetails?.hostelId ||
              studentData.hostel;
              
            const floor = 
              issue.floor || 
              issue.hostelDetails?.floor || 
              studentData.hostelDetails?.floor ||
              studentData.floor;
              
            const roomNumber = 
              issue.roomNumber ||
              issue.room ||
              issue.hostelDetails?.roomNumber || 
              studentData.hostelDetails?.roomNumber ||
              studentData.room;
            
            return {
              ...issue,
              source: 'student_document',
              studentName: studentData.fullName || studentData.name,
              studentId: studentDoc.id,
              userId: userId,
              timestamp: issue.timestamp || issue.date || new Date().toISOString(),
              solved: issue.solved || issue.isSolved || false,
              hostelDetails: {
                hostelId: hostelId,
                floor: floor,
                roomNumber: roomNumber,
                room_id: issue.room_id || studentData.hostelDetails?.room_id
              },
              message: issue.message || issue.content,
              content: issue.content || issue.message
            };
          });
          
          processedIssues.sort((a, b) => {
            const dateA = new Date(a.timestamp).getTime();
            const dateB = new Date(b.timestamp).getTime();
            return dateB - dateA;
          });
          
          allIssues.push(...processedIssues.slice(0, limitParam));
        }
      }
    } catch (err) {
      console.warn('Error fetching from student document:', err);
    }
    
    allIssues.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });
    
    const limitedIssues = allIssues.slice(0, limitParam);
    
    return NextResponse.json(
      { 
        maintenanceIssues: limitedIssues,
        issues: limitedIssues,
        count: limitedIssues.length
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    );
    
  } catch (error) {
    console.error('Error fetching issues:', error);
    
    const errorPayload = { 
      error: 'Failed to fetch issues', 
      message: error instanceof Error ? error.message : 'Unknown error',
      maintenanceIssues: [],
      issues: []
    };
    
    return NextResponse.json(
      errorPayload,
      { 
        status: 500,
        headers: { 
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    );
  }
}

export const config = {
  runtime: 'nodejs'
};
