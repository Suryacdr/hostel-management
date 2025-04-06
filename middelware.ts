import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
    try {
        const serviceAccount = require('./serviceAccountKey.json');
        initializeApp({
            credential: cert(serviceAccount),
        });
    } catch (error) {
        console.error("Firebase initialization error:", error);
    }
}

// Role hierarchy (can be kept for reference or other potential uses)
const roleHierarchy = {
    'chief_warden': ['supervisor', 'hostel_warden', 'floor_warden', 'floor_attendant', 'student'],
    'supervisor': ['hostel_warden', 'floor_warden', 'floor_attendant', 'student'],
    'hostel_warden': ['floor_warden', 'floor_attendant', 'student'],
    'floor_warden': ['floor_attendant', 'student'],
    'floor_attendant': ['student'],
    'student': []
};

// Route permissions - Each role can only access their own dashboard
const routePermissions: Record<string, string[]> = {
    '/dashboard/chief-warden': ['chief_warden'],
    '/dashboard/supervisor': ['supervisor'],
    '/dashboard/hostel-warden': ['hostel_warden'],
    '/dashboard/floor-warden': ['floor_warden'],
    '/dashboard/floor-attendant': ['floor_attendant'],
    '/dashboard/student': ['student'],
    '/dashboard': ['chief_warden', 'supervisor', 'hostel_warden', 'floor_warden', 'floor_attendant', 'student']
};

// Get default redirect path for a role
function getDefaultPathForRole(role: string): string {
    switch(role) {
        case 'chief_warden': return '/dashboard/chief-warden';
        case 'supervisor': return '/dashboard/supervisor';  
        case 'hostel_warden': return '/dashboard/hostel-warden';
        case 'floor_warden': return '/dashboard/floor-warden';
        case 'floor_attendant': return '/dashboard/floor-attendant';
        case 'student': return '/dashboard/student';
        default: return '/';
    }
}

export async function middleware(request: NextRequest) {
    // Only apply middleware to dashboard routes
    if (!request.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.next();
    }

    const loginUrl = new URL('/', request.url); // Redirect to home/login page

    try {
        const sessionCookie = request.cookies.get('session')?.value;
        if (!sessionCookie) {
            // No session cookie, definitely redirect
            console.log("Middleware: No session cookie. Redirecting to login.");
            return NextResponse.redirect(loginUrl);
        }

        // Verify the session cookie and check for revocation
        const decodedClaims = await getAuth().verifySessionCookie(sessionCookie, true);
        const userRole = decodedClaims.role as string | undefined; // Extract role

        // Check if role exists in the token claims
        if (!userRole) {
            console.warn("Middleware: No role found in token claims. Redirecting to login.");
            // Clear the potentially invalid cookie
            const response = NextResponse.redirect(loginUrl);
            response.cookies.delete('session');
            return response;
        }
        
        // Get current path and normalize it to handle trailing slashes
        const path = request.nextUrl.pathname;
        const normalizedPath = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
        
        // Special case for the root dashboard path - redirect to specific dashboard
        if (normalizedPath === '/dashboard') {
            const defaultRedirectPath = getDefaultPathForRole(userRole);
            return NextResponse.redirect(new URL(defaultRedirectPath, request.url));
        }
        
        // Check if the current path has permissions defined
        if (normalizedPath in routePermissions) {
            // Check if user's role is allowed for this exact path
            const allowedRoles = routePermissions[normalizedPath];
            
            if (!allowedRoles.includes(userRole)) {
                console.log(`Middleware: Access DENIED for role '${userRole}' to path '${normalizedPath}'. Unauthorized.`);
                
                // Return an unauthorized response
                return new Response('Unauthorized: You do not have permission to access this page', {
                    status: 403,
                    headers: {
                        'Content-Type': 'text/plain',
                    },
                });
            }
        } else {
            // For paths not explicitly defined, check if it's a sub-path of a defined route
            let hasMatchingParentRoute = false;
            let isAuthorized = false;
            
            // Sort routes by specificity (longest first) to check most specific routes first
            const sortedRoutes = Object.keys(routePermissions)
                .sort((a, b) => b.length - a.length);
                
            for (const routePath of sortedRoutes) {
                // Check if current path is a sub-path of this route
                if (normalizedPath.startsWith(routePath + '/')) {
                    hasMatchingParentRoute = true;
                    const allowedRoles = routePermissions[routePath];
                    
                    if (allowedRoles.includes(userRole)) {
                        isAuthorized = true;
                        break;
                    }
                }
            }
            
            // If no parent route matches or user is not authorized for the parent route
            if (!hasMatchingParentRoute || !isAuthorized) {
                console.log(`Middleware: Access DENIED for role '${userRole}' to path '${normalizedPath}'. No matching route or unauthorized.`);
                
                // Return an unauthorized response
                return new Response('Unauthorized: You do not have permission to access this page', {
                    status: 403,
                    headers: {
                        'Content-Type': 'text/plain',
                    },
                });
            }
        }
        
        // User has access, enrich request headers and proceed
        console.log(`Middleware: Access GRANTED for role '${userRole}' to path '${path}'.`);
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', decodedClaims.uid || '');
        requestHeaders.set('x-user-role', userRole); // Pass the validated role

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });

    } catch (error) {
        // Catches errors like invalid/expired session cookie
        console.error('Middleware Authentication/Verification error:', error);
        // Clear the potentially invalid cookie and redirect to login
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete('session');
        return response;
    }
}

export const config = {
    matcher: [
        '/dashboard', 
        '/dashboard/:path*'
    ],
};
