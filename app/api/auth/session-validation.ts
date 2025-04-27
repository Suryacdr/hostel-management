import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
try {
  if (!getApps().length) {
    // Try to load from environment variable first
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      // Fall back to local file for development
      try {
        serviceAccount = require('../../../serviceAccountKey.json');
      } catch (e) {
        console.error("Could not load service account from file:", e);
      }
    }

    if (!serviceAccount) {
      throw new Error('Firebase service account is missing');
    }

    initializeApp({
      credential: cert(serviceAccount),
    });
  }
} catch (error) {
  console.error("Firebase Admin initialization error:", error);
}

/**
 * Validates a Firebase session cookie
 * Use this in API routes where you need to verify authentication
 * @param request The incoming request object
 * @returns An object with session information or throws error
 */
export async function validateSession(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value;

  if (!sessionCookie) {
    throw new Error('No session cookie found');
  }

  try {
    // Verify the session cookie and check for revocation
    const decodedClaims = await getAuth().verifySessionCookie(sessionCookie, true);
    
    return {
      uid: decodedClaims.uid || '',
      role: decodedClaims.role as string || '',
      email: decodedClaims.email || '',
      // Add any other claims you need
    };
  } catch (error) {
    console.error("Session validation error:", error);
    throw error;
  }
}

/**
 * Helper to create an unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized: Invalid or missing authentication') {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

/**
 * Helper to create a forbidden response
 */
export function forbiddenResponse(message = 'Forbidden: Insufficient permissions') {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}
