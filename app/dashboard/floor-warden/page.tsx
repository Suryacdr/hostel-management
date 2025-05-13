"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { auth } from "@/lib/firebase";
import {
  User,
  Mail,
  Phone,
  Building2,
  Users,
  LogOut,
  Menu,
  X,
  Clock,
  CircleDotDashed,
  CheckCheck,
  ArrowUp,
  DoorOpen,
  Settings,
  UserCircle,
  ShieldAlert,
  Bell,
  Home,
  LayoutGrid
} from "lucide-react";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";
import ProfileImageUploader from "@/components/ProfileImageUploader";
import { signOut, updateProfile } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";

interface Student {
  id?: string;
  name?: string;
  fullName?: string;
  email: string;
  course?: string;
  department?: string;
  room?: string;
  hostel?: string;
  floorId?: string;
  floor?: string;
  registrationNumber?: number;
  year?: string;
  dateOfOccupancy?: string;
  age?: number;
  phoneNumber?: number;
  hostelDetails?: {
    hostelId: string;
    room_id: string;
    roomNumber: string;
    floor: string;
    floorName?: string;
  };
  profilePictureUrl?: string;
  uid?: string;
  floorName?: string;
}

interface FloorAttendant {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  assignedFloors?: string[];
  assignedFloorNames?: string[];
}

interface Floor {
  id: string;
  name?: string;
  number?: string | number;
  hostelId?: string;
  totalRooms?: number;
  totalStudents?: number;
}

interface Room {
  id: string;
  number: string;
  floorId: string;
  capacity: number;
  occupancy: number;
}

interface Issue {
  id: string;
  message: string;
  type: string;
  timestamp: Date;
  solved: boolean;
  studentName: string;
  studentId: string;
  hostel?: string;
  floor?: string;
  room?: string;
  category?: string;
  studentRoom?: string;
}

interface FloorWardenProfile {
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  assignedFloors?: string[];
  assignedFloorNames?: string[];
  profilePictureUrl?: string;
}

interface DashboardData {
  floorWarden?: FloorWardenProfile;
  floors?: Floor[];
  rooms?: Room[];
  issues?: Issue[];
  attendants?: FloorAttendant[];
  students?: Student[];
}

export default function FloorWardenDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'solved'>('all');
  const [filterType, setFilterType] = useState<'all' | 'complaint' | 'maintenance'>('all');
  const [activeTab, setActiveTab] = useState<'issues' | 'students' | 'attendants'>('issues');
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        window.location.href = "/";
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
  };

  const handleMenuOpen = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleOpenEditModal = () => {
    setIsModalOpen(true);
    setIsMenuOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleImageUploaded = async (imageUrl: string) => {
    if (auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, {
          photoURL: imageUrl,
        });

        setData((prev) => prev ? {
          ...prev,
          floorWarden: prev.floorWarden ? {
            ...prev.floorWarden,
            profilePictureUrl: imageUrl
          } : undefined
        } : null);

        fetchDashboardData();
      } catch (error) {
        console.error("Error updating profile picture:", error);
      }
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setError("User not authenticated");
        return;
      }

      const token = await user.getIdToken(true);

      const response = await fetch("/api/fetch", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const dashboardData = await response.json();
      console.log("Base dashboard data loaded for floor warden:", dashboardData);

      const floorIds = dashboardData.floors?.map((floor: Floor) => floor.id) || [];
      
      if (floorIds.length === 0) {
        console.warn("No floor IDs found in dashboard data!");
      } else {
        console.log("Found floor IDs:", floorIds);
      }
      
      const issuesUrl = new URL("/api/issue/floor-issues", window.location.origin);
      console.log("Fetching issues from:", issuesUrl.toString());
      
      const issuesResponse = await fetch(issuesUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      let issues: Issue[] = [];
      if (issuesResponse.ok) {
        const issuesData = await issuesResponse.json();
        console.log("Issues data received:", issuesData);
        issues = issuesData.issues || [];
      } else {
        console.error("Failed to fetch issues:", await issuesResponse.text());
      }

      let students: Student[] = [];
      
      // Fetch all students assigned to the floor warden's floors using the enhanced API
      try {
        const studentsUrl = new URL("/api/students/get-students", window.location.origin);
        
        console.log("Fetching students for floor warden's assigned floors");
        
        const studentsResponse = await fetch(studentsUrl.toString(), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        
        if (studentsResponse.ok) {
          const studentsData = await studentsResponse.json();
          console.log("Students data received:", studentsData);
          students = studentsData.students || [];
          
          // Add floor names to students for easier display/filtering
          if (students.length > 0 && dashboardData.floors) {
            const floorMap = new Map();
            dashboardData.floors.forEach((floor: Floor) => {
              floorMap.set(floor.id, floor.name || `Floor ${floor.number}`);
            });
            
            students = students.map(student => {
              const floorId = student.hostelDetails?.floor || student.floorId || student.floor;
              const floorName = floorId ? floorMap.get(floorId) : undefined;
              
              return {
                ...student,
                floorName,
                hostelDetails: student.hostelDetails ? {
                  ...student.hostelDetails,
                  floorName
                } : undefined
              };
            });
          }
        } else {
          console.error("Failed to fetch students:", await studentsResponse.text());
        }
      } catch (error) {
        console.error("Error fetching students:", error);
      }
      
      let attendants: FloorAttendant[] = [];
      if (floorIds.length > 0) {
        try {
          const staffUrl = new URL("/api/staff", window.location.origin);
          staffUrl.searchParams.append("floorIds", floorIds.join(','));
          staffUrl.searchParams.append("role", "floor_attendant");
          
          console.log("Fetching floor attendants from:", staffUrl.toString());
          
          const attendantsResponse = await fetch(staffUrl.toString(), {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          
          if (attendantsResponse.ok) {
            const attendantsData = await attendantsResponse.json();
            console.log("Floor attendants data received:", attendantsData);
            attendants = attendantsData.floorAttendants || [];
          } else {
            console.error("Failed to fetch floor attendants:", await attendantsResponse.text());
          }
        } catch (error) {
          console.error("Error fetching floor attendants:", error);
        }
      }
      
      const combinedData: DashboardData = {
        ...dashboardData,
        issues: issues.length > 0 ? issues : (dashboardData.issues || []),
        students: students.length > 0 ? students : (dashboardData.students || []),
        attendants: attendants.length > 0 ? attendants : (dashboardData.attendants || [])
      };

      console.log("Complete dashboard data:", combinedData);
      setData(combinedData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateIssueStatus = async (issueId: string, solved: boolean) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setError("User not authenticated");
        return;
      }

      const token = await user.getIdToken(true);

      const response = await fetch('/api/issue/update-issue', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          issueId,
          solved
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update issue status');
      }

      setData(prevData => {
        if (!prevData || !prevData.issues) return prevData;
        
        return {
          ...prevData,
          issues: prevData.issues.map(issue => 
            issue.id === issueId 
              ? { ...issue, solved } 
              : issue
          )
        };
      });

    } catch (error) {
      console.error('Error updating issue status:', error);
      alert('Failed to update issue status. Please try again.');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getFilteredIssues = useCallback(() => {
    if (!data?.issues) return [];
    
    return data.issues.filter(issue => {
      const matchesStatus = 
        filterStatus === 'all' || 
        (filterStatus === 'pending' && !issue.solved) || 
        (filterStatus === 'solved' && issue.solved);
        
      const matchesType = 
        filterType === 'all' || 
        issue.type === filterType;
        
      const matchesFloor = 
        selectedFloor === 'all' || 
        issue.floor === selectedFloor;
        
      return matchesStatus && matchesType && matchesFloor;
    });
  }, [data?.issues, filterStatus, filterType, selectedFloor]);

  const getFilteredStudents = useCallback(() => {
    if (!data?.students) return [];
    
    return data.students.filter(student => {
      const studentFloorId = student.hostelDetails?.floor || student.floorId || student.floor;
      return selectedFloor === 'all' || studentFloorId === selectedFloor;
    });
  }, [data?.students, selectedFloor]);

  const getFilteredAttendants = useCallback(() => {
    if (!data?.attendants) return [];
    
    return data.attendants.filter(attendant => 
      selectedFloor === 'all' || 
      (attendant.assignedFloors && attendant.assignedFloors.includes(selectedFloor))
    );
  }, [data?.attendants, selectedFloor]);

  const filteredIssues = useMemo(() => getFilteredIssues(), [getFilteredIssues]);
  const filteredStudents = useMemo(() => getFilteredStudents(), [getFilteredStudents]);
  const filteredAttendants = useMemo(() => getFilteredAttendants(), [getFilteredAttendants]);

  const statistics = useMemo(() => {
    const totalStudents = data?.students?.length || 0;
    const totalIssues = data?.issues?.length || 0;
    const pendingIssues = data?.issues?.filter(issue => !issue.solved).length || 0;
    const totalFloors = data?.floors?.length || 0;
    
    return {
      totalStudents,
      totalIssues,
      pendingIssues,
      totalFloors
    };
  }, [data?.students, data?.issues, data?.floors]);

  const formatDate = (timestamp: Date | string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      if (diffInHours === 0) {
        return `${Math.floor((now.getTime() - date.getTime()) / (1000 * 60))} minutes ago`;
      }
      return `${diffInHours} hours ago`;
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const FilterControls = () => (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 self-center mr-2">Floor:</span>
        <button
          onClick={() => setSelectedFloor('all')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            selectedFloor === 'all' 
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
          }`}
        >
          All Floors
        </button>
        
        {data?.floors?.map(floor => (
          <button
            key={floor.id}
            onClick={() => setSelectedFloor(floor.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              selectedFloor === floor.id 
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            {floor.name || `Floor ${floor.number}`}
          </button>
        ))}
      </div>
      
      {activeTab === 'issues' && (
        <>
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 self-center mr-2">Status:</span>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                filterStatus === 'all' 
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <Users size={14} className="inline mr-1" />
              All
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                filterStatus === 'pending' 
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' 
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <CircleDotDashed size={14} className="inline mr-1" />
              Pending
            </button>
            <button
              onClick={() => setFilterStatus('solved')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                filterStatus === 'solved' 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <CheckCheck size={14} className="inline mr-1" />
              Resolved
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 self-center mr-2">Type:</span>
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                filterType === 'all' 
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <LayoutGrid size={14} className="inline mr-1" />
              All Types
            </button>
            <button
              onClick={() => setFilterType('complaint')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                filterType === 'complaint' 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <ShieldAlert size={14} className="inline mr-1" />
              Complaints
            </button>
            <button
              onClick={() => setFilterType('maintenance')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                filterType === 'maintenance' 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <Settings size={14} className="inline mr-1" />
              Maintenance
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900 dark:text-white">
        <div className="bg-white dark:bg-slate-800 shadow-md mb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="flex md:hidden absolute top-4 right-4 z-10 items-center gap-2">
              <ThemeToggle />
              <button
                onClick={handleMenuOpen}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <Menu size={20} />
              </button>
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    ref={menuRef}
                    className="w-[200px] py-2 absolute bg-white dark:bg-slate-800 top-12 right-0 rounded-lg shadow-lg border border-gray-100 dark:border-slate-700 flex flex-col gap-0.5 z-50"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                  >
                    <button
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 transition-colors"
                      onClick={handleOpenEditModal}
                    >
                      <User size={16} />
                      <span className="text-sm font-medium">Edit Profile</span>
                    </button>
                    <div className="border-t border-gray-100 dark:border-slate-700 my-1"></div>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 text-red-500 transition-colors"
                    >
                      <LogOut size={16} />
                      <span className="text-sm font-medium">Logout</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="py-6 md:py-8 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">
              {loading ? (
                <ProfileSkeleton />
              ) : (
                <>
                  <div className="relative">
                    <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-700 bg-white dark:bg-slate-700 shadow-md shrink-0">
                      <Image
                        src={data?.floorWarden?.profilePictureUrl || "/boy.png"}
                        width={150}
                        height={150}
                        alt="Profile"
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <button
                      onClick={handleOpenEditModal}
                      className="absolute bottom-1 right-1 bg-white dark:bg-slate-700 rounded-full p-1.5 shadow-sm hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors border border-gray-100 dark:border-slate-600"
                    >
                      <User
                        size={14}
                        className="text-gray-600 dark:text-gray-300"
                      />
                    </button>
                  </div>

                  <div className="flex-1 w-full md:w-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center md:items-start">
                      <div className="text-center md:text-left mb-4 md:mb-0">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
                          {data?.floorWarden?.fullName || "Floor Warden"}
                        </h2>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300">
                            {data?.floorWarden?.role || "Floor Warden"}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                            {data?.floors?.length || 0} Floors Assigned
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex items-center justify-center md:justify-start gap-1.5">
                          <Mail className="w-4 h-4" />
                          {data?.floorWarden?.email || ""}
                        </div>
                        {data?.floorWarden?.phoneNumber && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center md:justify-start gap-1.5">
                            <Phone className="w-4 h-4" />
                            {data.floorWarden.phoneNumber}
                          </div>
                        )}
                      </div>

                      <div className="hidden md:flex items-center gap-3 relative">
                        <ThemeToggle />
                        <button
                          onClick={handleMenuOpen}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors relative"
                        >
                          <Menu size={20} />
                        </button>
                        <AnimatePresence>
                          {isMenuOpen && (
                            <motion.div
                              ref={menuRef}
                              className="w-[200px] py-2 absolute bg-white dark:bg-slate-800 top-12 right-0 rounded-lg shadow-lg border border-gray-100 dark:border-slate-700 flex flex-col gap-0.5 z-50"
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                            >
                              <button
                                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 transition-colors"
                                onClick={handleOpenEditModal}
                              >
                                <User size={16} />
                                <span className="text-sm font-medium">
                                  Edit Profile
                                </span>
                              </button>
                              <div className="border-t border-gray-100 dark:border-slate-700 my-1"></div>
                              <button
                                onClick={handleSignOut}
                                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 text-red-500 transition-colors"
                              >
                                <LogOut size={16} />
                                <span className="text-sm font-medium">
                                  Logout
                                </span>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                        <Home size={16} className="text-blue-500" />
                        <span className="text-xs md:text-sm font-medium">
                          {statistics.totalFloors} Floors
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                        <Users size={16} className="text-indigo-500" />
                        <span className="text-xs md:text-sm font-medium">
                          {statistics.totalStudents} Students
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                        <Bell size={16} className="text-red-500" />
                        <span className="text-xs md:text-sm font-medium">
                          {statistics.pendingIssues} Pending Issues
                        </span>
                      </div>
                      <Link href="/notice-board" className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg shadow-sm hover:bg-blue-600 transition-colors">
                        <span className="text-xs md:text-sm font-medium">
                          Maintenance Board
                        </span>
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-7xl mx-auto px-4 pb-8 w-full">
          <div className="mb-6 border-b border-gray-200 dark:border-slate-700">
            <div className="flex space-x-6">
              <button
                className={`py-3 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                  activeTab === 'issues'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('issues')}
              >
                Issues & Complaints
              </button>
              <button
                className={`py-3 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                  activeTab === 'students'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('students')}
              >
                Students
              </button>
              <button
                className={`py-3 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                  activeTab === 'attendants'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('attendants')}
              >
                Floor Attendants
              </button>
              <button
                className={`py-3 px-1 border-b-2 font-medium text-sm cursor-pointer ${
                  activeTab === 'attendants'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('attendants')}
              >
                Rooms Photo
              </button>
            </div>
          </div>

          <FilterControls />

          {loading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-5 w-32 bg-gray-200 dark:bg-slate-700 rounded-md"></div>
                      <div className="h-4 w-24 bg-gray-200 dark:bg-slate-700 rounded-md mt-2"></div>
                    </div>
                    <div className="h-8 w-24 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
                  </div>
                  <div className="mt-4">
                    <div className="h-4 w-full bg-gray-200 dark:bg-slate-700 rounded-md"></div>
                    <div className="h-4 w-5/6 bg-gray-200 dark:bg-slate-700 rounded-md mt-2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <motion.div 
              className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-4 rounded-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p>{error}</p>
            </motion.div>
          ) : (
            <>
              {activeTab === 'issues' && (
                <>
                  {(!filteredIssues || filteredIssues.length === 0) ? (
                    <motion.div
                      className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow text-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-20 h-20 mb-4 text-gray-300 dark:text-gray-600">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-2">
                          No issues found
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          There are currently no {filterStatus !== 'all' ? filterStatus : ''} 
                          {filterType !== 'all' ? ' ' + filterType : ''} issues
                          {selectedFloor !== 'all' ? ' for this floor' : ' for your assigned floors'}.
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      {filteredIssues.map((issue, index) => (
                        <motion.div
                          key={issue.id}
                          className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-xl shadow-md"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.05 * (index % 10) }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 
                              ${issue.type === 'maintenance'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}
                            >
                              {issue.type === 'maintenance' ? (
                                <Settings className="w-5 h-5" />
                              ) : (
                                <ShieldAlert className="w-5 h-5" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                                <div>
                                  <h3 className="font-medium text-gray-800 dark:text-white text-lg">
                                    {issue.studentName}
                                  </h3>
                                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                    <Clock size={12} className="mr-1" />
                                    {formatDate(issue.timestamp)}
                                  </div>
                                </div>
                                <div className="mt-2 sm:mt-0">
                                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    issue.solved
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                                  }`}>
                                    {issue.solved ? 'Resolved' : 'Pending'}
                                  </span>
                                </div>
                              </div>
                              
                              <p className="mt-3 text-gray-600 dark:text-gray-300">
                                {issue.message}
                              </p>
                              
                              <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 dark:border-slate-700">
                                <div className="flex flex-wrap gap-2">
                                  {issue.hostel && (
                                    <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
                                      <Building2 size={12} className="mr-1" />
                                      Hostel: {issue.hostel}
                                    </div>
                                  )}
                                  {issue.floor && (
                                    <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
                                      <ArrowUp size={12} className="mr-1" />
                                      Floor: {issue.floor}
                                    </div>
                                  )}
                                  {(issue.studentRoom || issue.room) && (
                                    <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
                                      <DoorOpen size={12} className="mr-1" />
                                      Room: {issue.studentRoom || issue.room}
                                    </div>
                                  )}
                                  {issue.type === 'maintenance' && issue.category && (
                                    <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
                                      <Settings size={12} className="mr-1" />
                                      {issue.category}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleUpdateIssueStatus(issue.id, !issue.solved)}
                                  className={`px-3 py-1 text-xs font-medium rounded-lg cursor-pointer ${
                                    issue.solved
                                      ? 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/40'
                                  }`}
                                >
                                  {issue.solved ? 'Mark as Pending' : 'Mark as Resolved'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'students' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loading ? (
                    Array(6).fill(0).map((_, index) => (
                      <motion.div
                        key={index}
                        className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md flex flex-col h-full animate-pulse"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.05 * index }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-slate-700"></div>
                          <div className="flex-1">
                            <div className="h-5 w-32 bg-gray-200 dark:bg-slate-700 rounded-md"></div>
                            <div className="h-4 w-24 bg-gray-200 dark:bg-slate-700 rounded-md mt-2"></div>
                            <div className="h-3 w-20 bg-gray-200 dark:bg-slate-700 rounded-md mt-2"></div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 space-y-2">
                          <div className="h-4 w-full bg-gray-200 dark:bg-slate-700 rounded-md"></div>
                          <div className="h-4 w-full bg-gray-200 dark:bg-slate-700 rounded-md"></div>
                          <div className="h-4 w-3/4 bg-gray-200 dark:bg-slate-700 rounded-md"></div>
                        </div>
                      </motion.div>
                    ))
                  ) : (!filteredStudents || filteredStudents.length === 0) ? (
                    <motion.div
                      className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow text-center col-span-full"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-20 h-20 mb-4 text-gray-300 dark:text-gray-600">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-2">
                          No student data available
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          There are no students assigned{selectedFloor !== 'all' ? ' to this floor' : ' to your floors'}.
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    filteredStudents.map((student, index) => (
                      <motion.div
                        key={student.id || index}
                        className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md flex flex-col h-full"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.05 * (index % 9) }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-700 shrink-0">
                            {student.profilePictureUrl ? (
                              <Image
                                src={student.profilePictureUrl}
                                width={56}
                                height={56}
                                alt={student.fullName || student.name || "Student"}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                                <UserCircle size={28} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-800 dark:text-white text-lg">
                              {student.fullName || student.name || "Unknown Student"}
                            </h3>
                            {student.course && student.department && (
                              <p className="text-sm text-blue-600 dark:text-blue-400">
                                {student.course} · {student.department}
                              </p>
                            )}
                            {(student.course && !student.department) && (
                              <p className="text-sm text-blue-600 dark:text-blue-400">{student.course}</p>
                            )}
                            {(!student.course && student.department) && (
                              <p className="text-sm text-blue-600 dark:text-blue-400">{student.department}</p>
                            )}
                            {student.registrationNumber && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Reg: {student.registrationNumber}
                              </p>
                            )}
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                                <ArrowUp size={10} className="mr-1" />
                                {student.hostelDetails?.floorName || student.floorName || `Floor ${student.hostelDetails?.floor || student.floor || student.floorId || 'Unknown'}`}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 space-y-2 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="truncate">{student.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span>{student.hostelDetails?.hostelId || student.hostel || "Unassigned Hostel"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DoorOpen className="w-4 h-4 text-gray-400" />
                            <span>Room {student.hostelDetails?.roomNumber || student.room || "Not assigned"}</span>
                          </div>
                          {student.phoneNumber && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{student.phoneNumber}</span>
                            </div>
                          )}
                          {student.year && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span>Year: {student.year}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'attendants' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(!filteredAttendants || filteredAttendants.length === 0) ? (
                    <motion.div
                      className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow text-center col-span-full"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-20 h-20 mb-4 text-gray-300 dark:text-gray-600">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-2">
                          No floor attendants available
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          There are no floor attendants assigned{selectedFloor !== 'all' ? ' to this floor' : ' to your floors'}.
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    filteredAttendants.map((attendant, index) => (
                      <motion.div
                        key={attendant.id}
                        className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.05 * (index % 9) }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-700">
                            {attendant.profilePictureUrl ? (
                              <Image
                                src={attendant.profilePictureUrl}
                                width={48}
                                height={48}
                                alt={attendant.fullName}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                                <UserCircle size={24} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-800 dark:text-white">{attendant.fullName}</h3>
                            <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                              Floor Attendant
                            </span>
                            <div className="mt-2 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <Mail size={12} />
                                {attendant.email}
                              </div>
                              {attendant.phoneNumber && (
                                <div className="flex items-center gap-1">
                                  <Phone size={12} />
                                  {attendant.phoneNumber}
                                </div>
                              )}
                              {attendant.assignedFloorNames && attendant.assignedFloorNames.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Home size={12} />
                                  Assigned to: {attendant.assignedFloorNames.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
            >
              <motion.div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto relative"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleCloseModal}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>

                <div className="p-6 sm:p-8">
                  <h2 className="text-2xl font-bold mb-6 dark:text-white flex items-center gap-2">
                    <User size={24} className="text-blue-500" />
                    Edit Profile
                  </h2>

                  <ProfileImageUploader
                    currentImageUrl={data?.floorWarden?.profilePictureUrl || ""}
                    studentName={data?.floorWarden?.fullName || ""}
                    onImageUploaded={handleImageUploaded}
                  />

                  <div className="flex justify-end mt-6">
                    <button
                      onClick={handleCloseModal}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthGuard>
  );
}

const ProfileSkeleton = () => {
  return (
    <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-10 w-full">
      <div className="w-32 h-32 md:w-36 md:h-36 rounded-full bg-gray-200 dark:bg-slate-700 shrink-0 animate-pulse"></div>
      <div className="flex-1 w-full">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start w-full">
          <div className="space-y-3 text-center md:text-left">
            <div className="h-7 w-48 bg-gray-200 dark:bg-slate-700 rounded-md animate-pulse mx-auto md:mx-0"></div>
            <div className="h-5 w-32 bg-gray-200 dark:bg-slate-700 rounded-md animate-pulse mx-auto md:mx-0"></div>
            <div className="h-4 w-56 bg-gray-200 dark:bg-slate-700 rounded-md animate-pulse mx-auto md:mx-0"></div>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-5 justify-center md:justify-start">
          <div className="h-10 w-32 bg-gray-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};
