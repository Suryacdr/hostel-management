# Hostel Management System - Technical Documentation

## System Architecture Overview

The Hostel Management System is built on a modern web stack with Next.js 14 as the foundation, providing both frontend and backend capabilities in a single codebase. Here's a detailed breakdown of how the system functions:

## Core Technical Components

### Authentication Flow

The authentication system uses Firebase Authentication with a custom role-based access control layer:

1. User credentials are validated against Firebase Auth via the client-side SDK in `lib/firebase.ts`
2. Upon successful authentication, the system retrieves custom claims containing the user's role
3. The role determines which dashboard the user is redirected to
4. A Firebase ID token is generated and stored for API requests
5. All subsequent API calls include this token in the Authorization header

The token verification happens server-side in API routes using Firebase Admin SDK, which validates the signature and extracts user information including UID and custom claims.

### Data Flow Architecture

```
Client Request → Next.js API Routes → Firebase Admin SDK → Firestore → Response
```

When a dashboard component loads:
1. The component calls `auth.currentUser.getIdToken(true)` to get a fresh token
2. This token is sent to the appropriate API endpoint (e.g., `/api/fetch`)
3. The API verifies the token and extracts the user's role
4. Based on the role, different Firestore queries are executed
5. The data is formatted and returned to the client

### Theme System Implementation

The theme system uses a context-based approach with localStorage persistence:

1. `ThemeProvider.tsx` creates a React context that holds the current theme state
2. On initial load, it checks localStorage for a saved preference
3. If none exists, it defaults to the system preference using `window.matchMedia`
4. The `ThemeToggle` component provides UI controls to switch between themes
5. Theme changes are persisted to localStorage and applied via CSS classes

The implementation uses Tailwind's dark mode strategy with class-based switching, allowing for smooth transitions between light and dark modes.

## Component Interactions

### Student Dashboard

The student dashboard (`app/dashboard/student/page.tsx`) demonstrates the complete data flow:

1. On mount, it subscribes to Firebase Auth state changes via `onAuthStateChanged`
2. When a user is authenticated, it calls `fetchStudentData()`
3. This function:
   - Gets a fresh token from Firebase Auth
   - Makes a request to `/api/fetch`
   - Processes the returned data
   - Updates local state with student information and posts
4. The UI renders based on this state, showing profile information and posts
5. New posts are created client-side and will be persisted via API calls

The post creation flow:
1. User enters content and selects a tag (Complaint/Maintenance)
2. The `handlePost` function creates a new post object
3. This is added to the local state for immediate UI feedback
4. In a production environment, this would also trigger an API call to persist the data

### API Route Implementation

The fetch API (`app/api/fetch/route.ts`) demonstrates role-based data access:

1. It first authenticates the request by verifying the Firebase token
2. It extracts the user's role from the token or custom claims
3. Using a switch statement, it executes different Firestore queries based on the role:
   - Students: Retrieves their own profile and posts
   - Floor Attendants: Retrieves assigned floor data and related maintenance requests
   - Floor Wardens: Retrieves multiple floors and their rooms
   - Hostel Wardens: Retrieves hostel data and all complaints/maintenance for that hostel
   - Chief Wardens: Retrieves data across all hostels

Each role receives only the data they need and are authorized to access, implementing proper data segregation.

## Role-Based Access Control (RBAC) Implementation

The hostel management system uses **Role-Based Access Control (RBAC)** to secure application routes based on user roles. The middleware enforces authentication and authorization, ensuring users can only access permitted resources.  

---

## Middleware Overview

The middleware acts as a **gatekeeper** for protected routes under `/dashboard`. It intercepts incoming requests, verifies authentication, and checks role-based permissions before granting access.  

---

## Key Components of RBAC Implementation

### 1. Route Interception

```typescript
// Only apply middleware to dashboard routes
if (!request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.next();
}
```  

The middleware is applied only to **dashboard routes** like `/`, allowing public pages to be accessed without authentication checks.  

---

### 2. Session Verification

```typescript
// Get session token from cookies
const sessionCookie = request.cookies.get('session')?.value;

if (!sessionCookie) {
    // Redirect to home page if no session cookie
    return NextResponse.redirect(new URL('/', request.url));
}

// Verify the session cookie
const decodedClaims = await getAuth().verifySessionCookie(sessionCookie, true);
```  

Firebase Auth’s session cookies are used for authentication. The middleware extracts the session token, verifies it with Firebase, and retrieves user claims, including their role.  

---

### 3. Role Extraction and Route Matching

```typescript
// Check if user has required role for the route
const userRole = decodedClaims.role || 'student';
const path = request.nextUrl.pathname;

// Find the most specific matching route
const matchingRoutes = Object.keys(routePermissions)
    .filter(route => path.startsWith(route))
    .sort((a, b) => b.length - a.length); // Sort by specificity (longest first)
```  

The user’s role is extracted from their session. The system then determines the **most specific** matching route permission by sorting routes by length, ensuring that specific routes take precedence over broader ones.  

---

### 4. Role Hierarchy and Permission Checking

```typescript
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
```  

The system enforces **role-based access** using:  

1. **Direct Role Matching** – Users must have the required role for a given route.  
2. **Role Hierarchy** – Higher roles inherit permissions from lower roles (e.g., a **Super Admin** has all the permissions of an **Admin**).  
3. **Access Enforcement** – Unauthorized users are redirected to the home page.  

The `roleHierarchy` object defines these relationships, making the system **scalable** and **flexible**.  

---

### 5. User Context Propagation

```typescript
// Add user info to request headers for use in the application
const requestHeaders = new Headers(request.headers);
requestHeaders.set('x-user-id', decodedClaims.uid || '');
requestHeaders.set('x-user-role', userRole);

return NextResponse.next({
    request: {
        headers: requestHeaders,
    },
});
```  

Once authentication and authorization checks pass, the middleware **enriches the request** by adding user details (ID and role) to the request headers. This allows other parts of the application to access user information without revalidating the token.  

---

### Role-Based Access Table  

| **User Role**  | **Can Access**                        | **Cannot Access** |
|---------------|------------------------------------------------|-----------------------------|
| **Super Admin** | Admin dashboards, all hostel settings, user management | N/A |
| **Admin**      | Own hostel settings, Co-admin management | Other hostel admins' settings |
| **Co-Admin**   | Assigned floors, room allocations | Other hostel floors, admin settings |
| **Student**    | View room details, raise complaints | Manage users, allocate rooms |

---

With this **RBAC implementation**, the system ensures **security, role-based flexibility, and ease of management** for hostel administration.

## Database Structure and Relationships

The Firestore database uses a document-based structure with the following collections:

- **students**: Contains student profiles with embedded arrays for complaints and maintenance
- **staff**: Contains profiles for wardens and attendants with role designations
- **hostels**: Contains hostel information with references to floors
- **floors**: Contains floor information with references to rooms and hostel
- **rooms**: Contains room information with references to assigned students
- **posts**: Contains all complaints and maintenance requests as separate documents

The system uses both embedded data (for simple relationships) and document references (for complex relationships) to optimize query performance while maintaining data integrity.

## UI Component System

The UI is built with a component-based architecture using:

1. **Card Components**: For displaying profile information and posts
2. **Form Components**: For data input with validation
3. **Status Indicators**: Using color-coding for different states (pending, in-progress, completed)
4. **Theme Toggle**: For switching between light and dark modes

The `ThemeToggle` component demonstrates the component architecture:
1. It uses the theme context to access and modify the current theme
2. It renders a dropdown menu with theme options
3. When a theme is selected, it updates the context and persists the change

## Security Implementation

Security is implemented at multiple levels:

1. **Authentication**: Firebase Auth handles user identity verification
2. **Authorization**: Custom claims and role-based checks control access to resources
3. **API Security**: Token verification ensures only authenticated users can access API endpoints
4. **Data Security**: Firestore security rules (not visible in the provided code) would restrict access based on user roles

Each API route validates the user's token and role before executing any database operations, ensuring proper access control.

## License

This project is licensed under the MIT License - see the LICENSE file for details.



The middleware.ts file in your hostel management system implements a sophisticated Role-Based Access Control (RBAC) mechanism that secures your application routes based on user roles. Here's a detailed explanation of how it works:

