import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
    const serviceAccount = require('./serviceAccountKey.json');
    initializeApp({
        credential: cert(serviceAccount),
    });
}

// Define role hierarchy and permissions
const roleHierarchy = {
    'chief_warden': ['supervisor', 'hostel_warden', 'floor_warden', 'floor_attendant', 'student'],
    'supervisor': ['hostel_warden', 'floor_warden', 'floor_attendant', 'student'],
    'hostel_warden': ['floor_warden', 'floor_attendant', 'student'],
    'floor_warden': ['floor_attendant', 'student'],
    'floor_attendant': ['student'],
    'student': []
};

// Route permissions configuration
const routePermissions: Record<string, string[]> = {
    // '/dashboard': ['chief_warden', 'supervisor', 'hostel_warden', 'floor_warden', 'floor_attendant', 'student'],
    '/dashboard/chief-warden': ['chief_warden'],
    '/dashboard/supervisor': ['chief_warden', 'supervisor'],
    '/dashboard/hostel-warden': ['chief_warden', 'supervisor', 'hostel_warden'],
    '/dashboard/floor-warden': ['chief_warden', 'supervisor', 'hostel_warden', 'floor_warden'],
    '/dashboard/floor-attendant': ['chief_warden', 'supervisor', 'hostel_warden', 'floor_warden', 'floor_attendant'],
    '/dashboard/student': ['chief_warden', 'supervisor', 'hostel_warden', 'floor_warden', 'floor_attendant', 'student']
};

export async function middleware(request: NextRequest) {
    // Only apply middleware to dashboard routes
    if (!request.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.next();
    }

    try {
        // Get session token from cookies
        const sessionCookie = request.cookies.get('session')?.value;

        if (!sessionCookie) {
            // Redirect to home page if no session cookie
            return NextResponse.redirect(new URL('/', request.url));
        }

        // Verify the session cookie
        const decodedClaims = await getAuth().verifySessionCookie(sessionCookie, true);

        // Check if user has required role for the route
        const userRole = decodedClaims.role || 'student';
        const path = request.nextUrl.pathname;

        // Find the most specific matching route
        const matchingRoutes = Object.keys(routePermissions)
            .filter(route => path.startsWith(route))
            .sort((a, b) => b.length - a.length); // Sort by specificity (longest first)

        if (matchingRoutes.length > 0) {
            const matchedRoute = matchingRoutes[0];
            const allowedRoles = routePermissions[matchedRoute];

            // Check if user's role is allowed for this route
            let hasAccess = allowedRoles.includes(userRole);

            // Check role hierarchy if userRole is a valid key
            if (userRole in roleHierarchy) {
                const hierarchyRoles = roleHierarchy[userRole as keyof typeof roleHierarchy];
                hasAccess = hasAccess || allowedRoles.some(role => hierarchyRoles.includes(role as never));
            }

            if (!hasAccess) {
                // Redirect to home page if user doesn't have permission
                return NextResponse.redirect(new URL('/', request.url));
            }
        }

        // Add user info to request headers for use in the application
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', decodedClaims.uid || '');
        requestHeaders.set('x-user-role', userRole);

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    } catch (error) {
        console.error('Authentication error:', error);
        // Redirect to home page on authentication error
        return NextResponse.redirect(new URL('/', request.url));
    }
}

// Configure which routes this middleware applies to
export const config = {
    matcher: ['/dashboard/:path*'],
};
