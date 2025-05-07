"use client";

import { useEffect, useState, useRef } from "react";
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
  Shield,
  GraduationCap,
  Bolt as Tool,
} from "lucide-react";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";
import ProfileImageUploader from "@/components/ProfileImageUploader";
import { signOut, updateProfile } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";

interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  assignedHostel?: string;
  assignedFloors?: string[];
  assignedFloorNames?: string[];
  profilePictureUrl?: string;
}

interface StudentData {
  id: string;
  name: string;
  email: string;
  course: string;
  department: string;
  room: string;
  hostel: string;
  profilePictureUrl?: string;
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

interface HostelWardenProfile {
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  assignedHostel: string;
  profilePictureUrl?: string;
}

interface Floor {
  id: string;
  number: string;
  name?: string;
  hostelId: string;
}

interface DashboardData {
  warden?: HostelWardenProfile;
  hostel?: any;
  floors?: Floor[];
  issues?: Issue[];
  complaints?: any[];
  maintenance?: any[];
}

export default function HostelWarden() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'solved'>('all');
  const [activeTab, setActiveTab] = useState<'issues' | 'staff' | 'students'>('issues');
  const [staffMembers, setStaffMembers] = useState<{
    floorWardens: StaffMember[];
    floorAttendants: StaffMember[];
  }>({ floorWardens: [], floorAttendants: [] });
  const [students, setStudents] = useState<StudentData[]>([]);
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
          warden: prev.warden ? {
            ...prev.warden,
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

      // Fetch basic dashboard data
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
      setData(dashboardData);
      
      // Fetch issues with appropriate filtering
      fetchIssues();

      if (dashboardData.hostel?.id) {
        await Promise.all([
          fetchStaffMembers(dashboardData.hostel.id, token),
          fetchStudents(dashboardData.hostel.id, token)
        ]);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchIssues = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setError("User not authenticated");
        return;
      }

      const token = await user.getIdToken(true);

      const issuesUrl = new URL("/api/issue/all-issues", window.location.origin);
      
      if (filterStatus !== 'all') {
        issuesUrl.searchParams.append('status', filterStatus);
      }
      
      const issuesResponse = await fetch(issuesUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!issuesResponse.ok) {
        throw new Error("Failed to fetch issues data");
      }

      const issuesData = await issuesResponse.json();

      setData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          issues: issuesData.maintenanceIssues || []
        };
      });
    } catch (err) {
      console.error("Error fetching issues:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const fetchStaffMembers = async (hostelId: string, token: string) => {
    try {
      // Fetch floor wardens
      const floorWardensUrl = new URL("/api/staff", window.location.origin);
      floorWardensUrl.searchParams.append('role', 'floor_warden');
      floorWardensUrl.searchParams.append('hostelId', hostelId);
      
      const floorWardensRes = await fetch(floorWardensUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      // Fetch floor attendants
      const floorAttendantsUrl = new URL("/api/staff", window.location.origin);
      floorAttendantsUrl.searchParams.append('role', 'floor_attendant');
      floorAttendantsUrl.searchParams.append('hostelId', hostelId);
      
      const floorAttendantsRes = await fetch(floorAttendantsUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (floorWardensRes.ok && floorAttendantsRes.ok) {
        const floorWardensData = await floorWardensRes.json();
        const floorAttendantsData = await floorAttendantsRes.json();
        
        setStaffMembers({
          floorWardens: floorWardensData.floorWardens || [],
          floorAttendants: floorAttendantsData.floorAttendants || []
        });
      }
    } catch (error) {
      console.error("Error fetching staff members:", error);
    }
  };

  const fetchStudents = async (hostelId: string, token: string) => {
    try {
      const studentsUrl = new URL("/api/students", window.location.origin);
      studentsUrl.searchParams.append('hostelId', hostelId);
      
      const studentsRes = await fetch(studentsUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData.students || []);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
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

  useEffect(() => {
    if (data?.hostel?.id) {
      fetchIssues();
    }
  }, [filterStatus, data?.hostel?.id]);

  // Format date for display
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

  // Issue Status Filter Component
  const IssueStatusFilter = () => (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => setFilterStatus('all')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          filterStatus === 'all' 
            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
            : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
        }`}
      >
        <Users size={16} />
        All Issues
      </button>
      <button
        onClick={() => setFilterStatus('pending')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          filterStatus === 'pending' 
            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' 
            : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
        }`}
      >
        <CircleDotDashed size={16} />
        Pending
      </button>
      <button
        onClick={() => setFilterStatus('solved')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          filterStatus === 'solved' 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
            : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
        }`}
      >
        <CheckCheck size={16} />
        Resolved
      </button>
    </div>
  );

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900 dark:text-white">
        {/* Header with profile info */}
        <div className="bg-white dark:bg-slate-800 shadow-md mb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            {/* Mobile menu controls */}
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

            {/* Profile section */}
            <div className="py-6 md:py-8 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">
              {loading ? (
                <ProfileSkeleton />
              ) : (
                <>
                  <div className="relative">
                    <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-700 bg-white dark:bg-slate-700 shadow-md shrink-0">
                      <Image
                        src={data?.warden?.profilePictureUrl || "/boy.png"}
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
                          {data?.warden?.fullName || "Hostel Warden"}
                        </h2>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300">
                            {data?.warden?.role?.replace('_', ' ') || "Hostel Warden"}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300">
                            Hostel: {data?.hostel?.name || data?.warden?.assignedHostel || "Not Assigned"}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex items-center justify-center md:justify-start gap-1.5">
                          <Mail className="w-4 h-4" />
                          {data?.warden?.email || ""}
                        </div>
                        {data?.warden?.phoneNumber && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center md:justify-start gap-1.5">
                            <Phone className="w-4 h-4" />
                            {data.warden.phoneNumber}
                          </div>
                        )}
                      </div>

                      {/* Desktop menu controls */}
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

                    {/* Stats */}
                    <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                        <Building2 size={16} className="text-orange-500" />
                        <span className="text-xs md:text-sm font-medium">
                          {data?.floors?.length || 0} Floors
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                        <Users size={16} className="text-orange-500" />
                        <span className="text-xs md:text-sm font-medium">
                          {students.length || 0} Students
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                        <Shield size={16} className="text-orange-500" />
                        <span className="text-xs md:text-sm font-medium">
                          {staffMembers.floorWardens.length + staffMembers.floorAttendants.length || 0} Staff
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                        <CircleDotDashed size={16} className="text-yellow-500" />
                        <span className="text-xs md:text-sm font-medium">
                          {data?.issues?.filter(issue => !issue.solved)?.length || 0} Pending Issues
                        </span>
                      </div>
                      <Link href="/notice-board" className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white rounded-lg shadow-sm hover:bg-orange-600 transition-colors">
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

        {/* Main content area */}
        <div className="flex-1 max-w-7xl mx-auto px-4 pb-8 w-full">
          {/* Tab navigation */}
          <div className="mb-6 border-b border-gray-200 dark:border-slate-700">
            <div className="flex space-x-6">
              <button
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'issues'
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('issues')}
              >
                <Tool size={16} />
                Issues & Maintenance
              </button>
              <button
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'staff'
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('staff')}
              >
                <Shield size={16} />
                Staff Members
              </button>
              <button
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'students'
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('students')}
              >
                <GraduationCap size={16} />
                Students
              </button>
            </div>
          </div>

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
                  <IssueStatusFilter />
                  
                  {(!data?.issues || data.issues.length === 0) ? (
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
                          There are currently no {filterStatus !== 'all' ? filterStatus : ''} issues for your hostel.
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      {data.issues.map((issue, index) => (
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
                                <svg
                                  className="w-5 h-5"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                  />
                                </svg>
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
                                <div className="mt-2 sm:mt-0 flex items-center gap-2">
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
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                    issue.type === 'maintenance'
                                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
                                      : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'
                                  }`}
                                >
                                  {issue.type === 'maintenance' ? 'Maintenance' : 'Complaint'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'staff' && (
                <div className="space-y-8">
                  {/* Floor Wardens Section */}
                  <div>
                    <h2 className="text-xl font-bold mb-4">Floor Wardens</h2>
                    {staffMembers.floorWardens.length === 0 ? (
                      <motion.div
                        className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <p className="text-gray-500 dark:text-gray-400">No floor wardens assigned to this hostel.</p>
                      </motion.div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {staffMembers.floorWardens.map((staff, index) => (
                          <motion.div
                            key={staff.id}
                            className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow hover:shadow-md transition-all duration-300 hover:-translate-y-1 border border-gray-100 dark:border-slate-700"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.05 * (index % 6) }}
                          >
                            <div className="bg-linear-to-r from-orange-500 to-amber-600 dark:from-orange-900 dark:to-amber-900 p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-full overflow-hidden bg-white dark:bg-slate-800 flex items-center justify-center shrink-0">
                                  {staff.profilePictureUrl ? (
                                    <Image
                                      src={staff.profilePictureUrl}
                                      width={56}
                                      height={56}
                                      alt={staff.fullName}
                                      className="object-cover w-full h-full"
                                    />
                                  ) : (
                                    <User className="w-7 h-7 text-orange-600 dark:text-orange-400" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-white">
                                    {staff.fullName}
                                  </h3>
                                  <span className="text-sm text-orange-100 mt-0.5 block">
                                    Floor Warden
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="p-4 space-y-3">
                              <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                <Mail className="w-4 h-4 text-orange-500" />
                                <span className="text-sm">{staff.email}</span>
                              </p>
                              {staff.phoneNumber && (
                                <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                  <Phone className="w-4 h-4 text-orange-500" />
                                  <span className="text-sm">{staff.phoneNumber}</span>
                                </p>
                              )}
                              {staff.assignedFloors && staff.assignedFloors.length > 0 && (
                                <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                  <Building2 className="w-4 h-4 text-orange-500" />
                                  <span className="text-sm">
                                    Floors: {staff.assignedFloorNames?.join(", ") || staff.assignedFloors.join(", ")}
                                  </span>
                                </p>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Floor Attendants Section */}
                  <div>
                    <h2 className="text-xl font-bold mb-4">Floor Attendants</h2>
                    {staffMembers.floorAttendants.length === 0 ? (
                      <motion.div
                        className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <p className="text-gray-500 dark:text-gray-400">No floor attendants assigned to this hostel.</p>
                      </motion.div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {staffMembers.floorAttendants.map((staff, index) => (
                          <motion.div
                            key={staff.id}
                            className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow hover:shadow-md transition-all duration-300 hover:-translate-y-1 border border-gray-100 dark:border-slate-700"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.05 * (index % 6) }}
                          >
                            <div className="bg-linear-to-r from-teal-500 to-green-600 dark:from-teal-900 dark:to-green-900 p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-full overflow-hidden bg-white dark:bg-slate-800 flex items-center justify-center shrink-0">
                                  {staff.profilePictureUrl ? (
                                    <Image
                                      src={staff.profilePictureUrl}
                                      width={56}
                                      height={56}
                                      alt={staff.fullName}
                                      className="object-cover w-full h-full"
                                    />
                                  ) : (
                                    <User className="w-7 h-7 text-teal-600 dark:text-teal-400" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-white">
                                    {staff.fullName}
                                  </h3>
                                  <span className="text-sm text-teal-100 mt-0.5 block">
                                    Floor Attendant
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="p-4 space-y-3">
                              <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                <Mail className="w-4 h-4 text-teal-500" />
                                <span className="text-sm">{staff.email}</span>
                              </p>
                              {staff.phoneNumber && (
                                <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                  <Phone className="w-4 h-4 text-teal-500" />
                                  <span className="text-sm">{staff.phoneNumber}</span>
                                </p>
                              )}
                              {staff.assignedFloors && staff.assignedFloors.length > 0 && (
                                <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                  <Building2 className="w-4 h-4 text-teal-500" />
                                  <span className="text-sm">
                                    Floors: {staff.assignedFloorNames?.join(", ") || staff.assignedFloors.join(", ")}
                                  </span>
                                </p>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'students' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(!students || students.length === 0) ? (
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
                          There are no students assigned to your hostel.
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    students.map((student, index) => (
                      <motion.div
                        key={student.id}
                        className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-md"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.05 * (index % 9) }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-700">
                            {student.profilePictureUrl ? (
                              <Image
                                src={student.profilePictureUrl}
                                width={48}
                                height={48}
                                alt={student.name}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                                <UserCircle size={24} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-800 dark:text-white">{student.name}</h3>
                            <p className="text-sm text-blue-600 dark:text-blue-400">{student.course}</p>
                            <div className="mt-2 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <Mail size={12} />
                                {student.email}
                              </div>
                              <div className="flex items-center gap-1">
                                <Building2 size={12} />
                                {student.hostel} · Room {student.room}
                              </div>
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

        {/* Profile edit modal */}
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
                    <User size={24} className="text-orange-500" />
                    Edit Profile
                  </h2>

                  <ProfileImageUploader
                    currentImageUrl={data?.warden?.profilePictureUrl || ""}
                    studentName={data?.warden?.fullName || ""}
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
