import { NextRequest, NextResponse } from 'next/server';
import { updateFirestoreWithUIDs } from '@/util/firestore-data';

// This script is used to update Firestore document IDs from custom IDs to Firebase UIDs
export async function POST(request: NextRequest) {
  try {
    // Run the update function
    const result = await updateFirestoreWithUIDs();
    
    // Return the result
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error updating Firestore:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}