import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = [
    '/notice-board',
    '/api/issue/all-issues'
];

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
    const path = request.nextUrl.pathname;
    
    // Check if the requested path is a public route
    if (publicRoutes.some(route => path.startsWith(route))) {
        console.log(`Public route '${path}' accessed. Allowing without authentication.`);
        return NextResponse.next();
    }
    
    // Only apply middleware to non-public routes (mainly dashboard)
    if (publicRoutes.some(route => path.startsWith(route)) || !path.startsWith('/dashboard')) {
        return NextResponse.next();
    }

    const loginUrl = new URL('/', request.url); // Redirect to home/login page

    try {
        const sessionCookie = request.cookies.get('session')?.value;
        if (!sessionCookie) {
            // No session cookie, definitely redirect
            console.log("No session cookie found. Redirecting to login.");
            return NextResponse.redirect(loginUrl);
        }

        // For Edge Runtime, we'll need to validate the session in API routes instead
        // Here we'll just check if the cookie exists and do basic header enrichment
        // The full validation will happen in the API routes where Node.js APIs are available

        // Extract user data from custom headers (these would be set by your auth system)
        // This is a simplified approach - in a real app, you'd have server components verify the token
        const userRole = request.headers.get('x-user-role') || '';
        const userId = request.headers.get('x-user-id') || '';
        
        if (!userRole) {
            console.warn("No role found in headers. Redirecting to login.");
            const response = NextResponse.redirect(loginUrl);
            response.cookies.delete('session');
            return response;
        }
        
        // Get current path and normalize it
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
                console.log(`Access DENIED for role '${userRole}' to path '${normalizedPath}'.`);
                
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
            
            // Sort routes by specificity (longest first)
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
                console.log(`Access DENIED for role '${userRole}' to path '${normalizedPath}'.`);
                
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
        console.log(`Access GRANTED for role '${userRole}' to path '${path}'.`);
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', userId);
        requestHeaders.set('x-user-role', userRole);

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });

    } catch (error) {
        // For public routes with invalid tokens, just continue without the token
        if (publicRoutes.some(route => path.includes(route))) {
            console.log(`Error on public route '${path}', but proceeding anyway.`);
            return NextResponse.next();
        }

        console.error('Middleware error:', error);
        // Clear the potentially invalid cookie and redirect to login
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete('session');
        return response;
    }
}

// Update the matcher to be more specific and exclude unnecessary routes
export const config = {
    matcher: [
        '/dashboard',
        '/dashboard/:path*'
    ],
};