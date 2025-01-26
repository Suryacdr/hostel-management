type Role = 'superAdmin' | 'admin' | 'coAdmin' | 'student';

export interface User {
    id: string;
    username: string;
    name: string;
    email: string;
    role: Role;
    hostelId?: string;
    floorIds?: string[];
    roomNumber?: string;
}

export interface Hostel {
    id: string;
    name: string;
    type: 'boys' | 'girls';
    adminId: string;
    floors: string[];
}

export interface Floor {
    id: string;
    hostelId: string;
    floorNumber: number;
    coAdminId: string;
    rooms: string[];
}

export interface Room {
    id: string;
    hostelId: string;
    floorId: string;
    roomNumber: string;
    students: string[];
}

export interface AttendanceRecord {
    [userId: string]: 'present' | 'absent';
}

export interface Attendance {
    id: string;
    date: string;
    hostelId: string;
    floorId: string;
    coAdminId: string;
    attendanceRecords: AttendanceRecord;
}

export interface Collections {
    users: User[];
    hostels: Hostel[];
    floors: Floor[];
    rooms: Room[];
    attendance: Attendance[];
}
