import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await verifyToken(token);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Read hostel data from JSON file
    const filePath = path.join(process.cwd(), 'util', 'hostel_data.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const hostelData = JSON.parse(fileContent);

    return NextResponse.json(hostelData);
  } catch (error) {
    console.error('Error fetching hostel data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hostel data' },
      { status: 500 }
    );
  }
}
