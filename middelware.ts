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

const routePermissions: Record<string, string[]> = {
    '/dashboard/chief-warden': ['chief_warden'],
    '/dashboard/supervisor': ['chief_warden', 'supervisor'],
    '/dashboard/hostel-warden': ['chief_warden', 'supervisor', 'hostel_warden'],
    '/dashboard/floor-warden': ['chief_warden', 'supervisor', 'hostel_warden', 'floor_warden'],
    '/dashboard/floor-attendant': ['chief_warden', 'supervisor', 'hostel_warden', 'floor_warden', 'floor_attendant'],
    '/dashboard/student': ['chief_warden', 'supervisor', 'hostel_warden', 'floor_warden', 'floor_attendant', 'student']
};

export async function middleware(request: NextRequest) {
    if (!request.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.next();
    }

    try {
        const sessionCookie = request.cookies.get('session')?.value;
        if (!sessionCookie) {
            return NextResponse.redirect(new URL('/', request.url));
        }

        const decodedClaims = await getAuth().verifySessionCookie(sessionCookie, true);
        const userRole = decodedClaims.role as keyof typeof roleHierarchy;
        const path = request.nextUrl.pathname;

        const matchedRoute = Object.keys(routePermissions)
            .filter(route => path.startsWith(route))
            .sort((a, b) => b.length - a.length)[0];

        if (matchedRoute) {
            const allowedRoles = routePermissions[matchedRoute];
            const hasAccess = allowedRoles.includes(userRole) ||
                (userRole in roleHierarchy && allowedRoles.some(role => (roleHierarchy[userRole] as string[]).includes(role)));

            if (!hasAccess) {
                return NextResponse.redirect(new URL('/', request.url));
            }
        }

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
        return NextResponse.redirect(new URL('/', request.url));
    }
}

export const config = {
    matcher: ['/dashboard/:path*'],
};
