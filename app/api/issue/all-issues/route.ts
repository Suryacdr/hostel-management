import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Query, DocumentData } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
const admin = (() => {
  if (!getApps().length) {
    try {
      // Try to load from environment variable first (recommended for production)
      let serviceAccount;
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } else {
        // Fall back to local file (for development)
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

// Get Firestore instance
const adminDb = getFirestore(admin);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const type = searchParams.get('type') || 'maintenance';
  const limitParam = parseInt(searchParams.get('limit') || '50', 10);
  
  try {
    // Create a reference to the maintenance issues collection
    const issuesRef = adminDb.collection('maintenance_issues');
    
    // Start building the query with basic conditions
    let issuesQuery: Query<DocumentData> = issuesRef;
    
    // Add filters based on parameters
    if (status === 'pending') {
      issuesQuery = issuesQuery.where('solved', '==', false);
    } else if (status === 'solved') {
      issuesQuery = issuesQuery.where('solved', '==', true);
    }
    
    if (type) {
      issuesQuery = issuesQuery.where('type', '==', type);
    }
    
    // Add ordering by timestamp (most recent first)
    issuesQuery = issuesQuery.orderBy('timestamp', 'desc');
    
    // Add limit to avoid excessive data transfer
    issuesQuery = issuesQuery.limit(limitParam);
    
    // Execute the query
    const issuesSnapshot = await issuesQuery.get();
    
    // Process the results
    const issues = issuesSnapshot.docs.map(doc => {
      const data = doc.data();
      // Convert Firestore Timestamp to ISO string for JSON serialization
      let timestamp;
      try {
        timestamp = data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString();
      } catch (e) {
        console.warn('Error converting timestamp:', e);
        timestamp = new Date().toISOString();
      }
      
      return {
        id: doc.id,
        ...data,
        timestamp
      };
    });
    
    // Return the response
    return NextResponse.json(
      { maintenanceIssues: issues },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    );
    
  } catch (error) {
    console.error('Error fetching maintenance issues:', error);
    
    // Create a guaranteed non-null payload object
    const errorPayload = { 
      error: 'Failed to fetch maintenance issues', 
      message: error instanceof Error ? error.message : 'Unknown error',
      maintenanceIssues: [] // Return empty array to avoid client-side errors
    };
    
    // Return error response with the valid payload object
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

// Ensure this route is processed by the Node.js runtime, not Edge Runtime
export const config = {
  runtime: 'nodejs'
};
