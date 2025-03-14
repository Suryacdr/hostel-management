// Role definitions
type Role = 'chief_warden' | 'supervisor' | 'hostel_warden' | 'floor_warden' | 'floor_attendant' | 'student';

// Status types
type ComplaintStatus = 'pending' | 'in-progress' | 'resolved' | 'rejected';
type MaintenanceStatus = 'pending' | 'in-progress' | 'completed' | 'scheduled';
type Priority = 'low' | 'medium' | 'high' | 'urgent';
type HostelType = 'boys' | 'girls';
type AttendanceStatus = 'present' | 'absent' | 'leave';
type LeaveStatus = 'pending' | 'approved' | 'rejected';

// User related interfaces
export interface User {
    id: string;
    email: string;
    fullName: string;
    firstName: string;
    lastName: string;
    role: Role;
    phoneNumber?: string;
    profileImage?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Student extends User {
    registrationNumber: number;
    course: string;
    age?: number;
    parentsName?: {
        father: string;
        mother: string;
    };
    permanentAddress?: {
        street: string;
        city: string;
        state: string;
        pincode: string;
    };
    hostelDetails: {
        hostel: string;
        roomNumber: string;
        floor: string;
    };
    roommateDetails?: {
        roommateId: string;
        roommateName: string;
    };
}

export interface Staff extends User {
    staffId: string;
    designation: Role;
    assignedHostels?: string[];
    assignedFloors?: string[];
}

// Hostel structure interfaces
export interface Hostel {
    id: string;
    name: string;
    type: HostelType;
    wardenId: string;
    supervisorId: string;
    totalFloors: number;
    totalRooms: number;
    address: string;
    floors: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Floor {
    id: string;
    hostelId: string;
    floorNumber: number;
    wardenId: string;
    attendantId: string;
    totalRooms: number;
    rooms: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Room {
    id: string;
    hostelId: string;
    floorId: string;
    roomNumber: string;
    capacity: number;
    occupants: string[];
    status: 'vacant' | 'partially_occupied' | 'fully_occupied' | 'maintenance';
    amenities: string[];
    createdAt: Date;
    updatedAt: Date;
}

// Activity interfaces
export interface Complaint {
    id: string;
    studentId: string;
    studentName: string;
    date: string;
    time: string;
    message: string;
    status: ComplaintStatus;
    reportedTo: string;
    assignedTo?: string;
    priority: Priority;
    category: string;
    resolution?: string;
    resolvedDate?: string;
    resolvedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface MaintenanceRequest {
    id: string;
    requesterId: string;
    requesterName: string;
    requesterRole: Role;
    date: string;
    time: string;
    message: string;
    status: MaintenanceStatus;
    reportedTo: string;
    assignedTo?: string;
    priority: Priority;
    location: {
        hostel: string;
        floor?: string;
        room?: string;
        area?: string;
    };
    category: string;
    estimatedCompletionDate?: string;
    completedDate?: string;
    completedBy?: string;
    notes?: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Attendance {
    id: string;
    date: string;
    hostelId: string;
    floorId: string;
    takenBy: string;
    takenByRole: Role;
    records: AttendanceRecord[];
    createdAt: Date;
    updatedAt: Date;
}

export interface AttendanceRecord {
    studentId: string;
    studentName: string;
    roomNumber: string;
    status: AttendanceStatus;
    remarks?: string;
}

export interface Leave {
    id: string;
    studentId: string;
    studentName: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: LeaveStatus;
    approvedBy?: string;
    approvedDate?: string;
    contactDuringLeave: string;
    parentContact: string;
    destination: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Remark {
    id: string;
    studentId: string;
    studentName: string;
    date: string;
    time: string;
    type: 'attendance' | 'behavior' | 'academic' | 'other';
    comment: string;
    reportedBy: string;
    reportedByRole: Role;
    status: 'pending' | 'acknowledged' | 'resolved';
    createdAt: Date;
    updatedAt: Date;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'announcement' | 'alert' | 'reminder' | 'update';
    priority: Priority;
    sender: string;
    senderRole: Role;
    recipients: {
        roles?: Role[];
        hostels?: string[];
        floors?: string[];
        specific?: string[];
    };
    read: string[];
    createdAt: Date;
    expiresAt?: Date;
}

export interface Post {
    id: string;
    content: string;
    tag: "Complaint" | "Maintenance";
    timestamp: Date;
    author: string;
    authorId: string;
    likes: number;
    solved: boolean;
    comments?: Comment[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Comment {
    id: string;
    postId: string;
    authorId: string;
    authorName: string;
    authorRole: Role;
    content: string;
    timestamp: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface VisitorLog {
    id: string;
    visitorName: string;
    visitorPhone: string;
    visitorIdType: string;
    visitorIdNumber: string;
    studentId: string;
    studentName: string;
    hostel: string;
    roomNumber: string;
    purpose: string;
    checkInTime: Date;
    checkOutTime?: Date;
    approvedBy: string;
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface InventoryItem {
    id: string;
    name: string;
    category: string;
    location: {
        hostel: string;
        floor?: string;
        room?: string;
        area?: string;
    };
    quantity: number;
    condition: 'excellent' | 'good' | 'fair' | 'poor' | 'unusable';
    lastMaintenanceDate?: string;
    nextMaintenanceDate?: string;
    purchaseDate?: string;
    purchasePrice?: number;
    supplier?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Collection interface for Firestore
export interface Collections {
    users: User[];
    students: Student[];
    staff: Staff[];
    hostels: Hostel[];
    floors: Floor[];
    rooms: Room[];
    complaints: Complaint[];
    maintenanceRequests: MaintenanceRequest[];
    attendance: Attendance[];
    leaves: Leave[];
    remarks: Remark[];
    notifications: Notification[];
    posts: Post[];
    comments: Comment[];
    visitorLogs: VisitorLog[];
    inventory: InventoryItem[];
}
