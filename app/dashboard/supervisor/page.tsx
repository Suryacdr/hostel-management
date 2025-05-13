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
  ChevronLeft,
  ChevronRight,
  Search,
  Briefcase,
  Calendar,
  GraduationCap,
  MapPin,
} from "lucide-react";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";
import ProfileImageUploader from "@/components/ProfileImageUploader";
import { signOut, updateProfile } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import AuthGuard from "@/components/AuthGuard";
import Link from "next/link";
import studentsData from "@/util/students.json";

interface StudentData {
  fullName: string;
  name?: string;
  registrationNumber: number | string;
  email: string;
  course: string;
  year: string;
  dateOfOccupancy: string;
  issues: any[];
  profilePictureUrl: string;
  age: number;
  phoneNumber: number;
  parentsDetails: any[];
  hostelDetails?: {
    hostelId?: string;
    room_id?: string;
    roomNumber?: string;
    floor?: string;
  };
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

interface SupervisorProfile {
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  assignedHostel: string;
  profilePictureUrl?: string;
}

interface DashboardData {
  supervisor?: SupervisorProfile;
  hostel?: any;
  floors?: any[];
  students?: StudentData[];
  issues?: Issue[];
  allStudents?: StudentData[];
}

export default function SupervisorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'solved'>('all');
  const [activeTab, setActiveTab] = useState<'issues' | 'students'>('issues');
  const menuRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredStudents, setFilteredStudents] = useState<StudentData[]>([]);
  const studentsPerPage = 9;

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
          supervisor: prev.supervisor ? {
            ...prev.supervisor,
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

      const allStudentsArray = studentsData.map((student) => ({
        id: student.registrationNumber.toString(),
        ...student,
        name: student.fullName,
        room: student.hostelDetails?.roomNumber || "",
        hostel: student.hostelDetails?.hostelId || "",
      }));

      const combinedData: DashboardData = {
        ...dashboardData,
        issues: issuesData.maintenanceIssues || [],
        students: dashboardData.students || [],
        allStudents: allStudentsArray,
      };

      setData(combinedData);
      setFilteredStudents(allStudentsArray);
      console.log("Dashboard data loaded for supervisor:", combinedData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
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
  }, [filterStatus]);

  useEffect(() => {
    if (!data?.allStudents) return;

    const filtered = data.allStudents.filter(student => 
      student.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.course?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.registrationNumber?.toString().includes(searchTerm)
    );

    setFilteredStudents(filtered);
    setCurrentPage(1);
  }, [searchTerm, data?.allStudents]);

  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

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
                        src={data?.supervisor?.profilePictureUrl || "/boy.png"}
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
                          {data?.supervisor?.fullName || "Supervisor"}
                        </h2>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                            {data?.supervisor?.role || "Supervisor"}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300">
                            Hostel: {data?.supervisor?.assignedHostel || "Not Assigned"}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex items-center justify-center md:justify-start gap-1.5">
                          <Mail className="w-4 h-4" />
                          {data?.supervisor?.email || ""}
                        </div>
                        {data?.supervisor?.phoneNumber && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center justify-center md:justify-start gap-1.5">
                            <Phone className="w-4 h-4" />
                            {data.supervisor.phoneNumber}
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
                        <Building2 size={16} className="text-blue-500" />
                        <span className="text-xs md:text-sm font-medium">
                          Hostel: {data?.hostel?.name || data?.supervisor?.assignedHostel || "Not Assigned"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                        <Users size={16} className="text-indigo-500" />
                        <span className="text-xs md:text-sm font-medium">
                          {data?.students?.length || 0} Students
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                        <CircleDotDashed size={16} className="text-yellow-500" />
                        <span className="text-xs md:text-sm font-medium">
                          {data?.issues?.filter(issue => !issue.solved)?.length || 0} Pending Issues
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
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'issues'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('issues')}
              >
                Student Issues
              </button>
              <button
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'students'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('students')}
              >
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
                          There are currently no {filterStatus !== 'all' ? filterStatus : ''} issues for your assigned hostel.
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

              {activeTab === 'students' && (
                <div className="space-y-6">
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                      <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <input
                      type="search"
                      className="block w-full p-3 ps-10 text-sm border rounded-lg bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 focus:ring-blue-500 focus:border-blue-500 dark:placeholder-gray-400"
                      placeholder="Search students by name, email, course or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  {filteredStudents.length === 0 ? (
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
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-2">
                          No students found
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          {searchTerm ? "No students match your search criteria." : "There are no students in the system."}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Showing {indexOfFirstStudent + 1}-{Math.min(indexOfLastStudent, filteredStudents.length)} of {filteredStudents.length} students
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {currentStudents.map((student, index) => (
                          <motion.div
                            key={student.registrationNumber}
                            className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-slate-700 transition-all hover:shadow-lg"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.05 * (index % 9) }}
                          >
                            <div className="p-1">
                              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-t-lg">
                                <div className="flex items-center gap-4">
                                  <div className="w-16 h-16 rounded-full overflow-hidden bg-white dark:bg-slate-700 ring-2 ring-white dark:ring-slate-600 shadow">
                                    {student.profilePictureUrl ? (
                                      <Image
                                        src={student.profilePictureUrl}
                                        width={64}
                                        height={64}
                                        alt={student.name || student.fullName}
                                        className="object-cover w-full h-full"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                                        <GraduationCap size={28} />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-gray-800 dark:text-white text-lg">{student.name}</h3>
                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                                      {student.registrationNumber && `#${student.registrationNumber}`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="p-5 space-y-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    <span className="truncate">{student.email}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <Briefcase className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    <span>{student.course || "Not specified"}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    <span>
                                      {student.hostelDetails?.hostelId || "Not assigned"} •
                                      Room {student.hostelDetails?.roomNumber || "N/A"}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    <span>Year: {student.year}</span>
                                  </div>
                                </div>

                                <div className="pt-3 border-t border-gray-100 dark:border-slate-700">
                                  <div className="flex flex-wrap gap-2">
                                    {student.hostelDetails?.floor && (
                                      <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-slate-700 rounded text-gray-700 dark:text-gray-300">
                                        Floor: {student.hostelDetails.floor}
                                      </span>
                                    )}
                                    <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-slate-700 rounded text-gray-700 dark:text-gray-300">
                                      Joined: {student.dateOfOccupancy}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-gray-200 dark:border-slate-700 pt-4 mt-4">
                          <div className="flex-1 flex justify-between sm:hidden">
                            <button
                              onClick={goToPreviousPage}
                              disabled={currentPage <= 1}
                              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md ${
                                currentPage <= 1
                                  ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-600'
                                  : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600'
                              }`}
                            >
                              Previous
                            </button>
                            <button
                              onClick={goToNextPage}
                              disabled={currentPage >= totalPages}
                              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md ${
                                currentPage >= totalPages
                                  ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-600'
                                  : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600'
                              }`}
                            >
                              Next
                            </button>
                          </div>
                          
                          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                Showing <span className="font-medium">{indexOfFirstStudent + 1}</span> to{' '}
                                <span className="font-medium">{Math.min(indexOfLastStudent, filteredStudents.length)}</span> of{' '}
                                <span className="font-medium">{filteredStudents.length}</span> students
                              </p>
                            </div>
                            
                            <div>
                              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button
                                  onClick={goToPreviousPage}
                                  disabled={currentPage <= 1}
                                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium ${
                                    currentPage <= 1
                                      ? 'text-gray-300 dark:text-gray-600'
                                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-600'
                                  }`}
                                >
                                  <span className="sr-only">Previous</span>
                                  <ChevronLeft className="h-5 w-5" />
                                </button>
                                
                                {[...Array(totalPages)].map((_, index) => {
                                  const pageNumber = index + 1;
                                  if (
                                    pageNumber === 1 ||
                                    pageNumber === totalPages ||
                                    (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                                  ) {
                                    return (
                                      <button
                                        key={pageNumber}
                                        onClick={() => goToPage(pageNumber)}
                                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                          pageNumber === currentPage
                                            ? 'z-10 bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-600'
                                        }`}
                                      >
                                        {pageNumber}
                                      </button>
                                    );
                                  } else if (
                                    (pageNumber === currentPage - 2 && currentPage > 3) ||
                                    (pageNumber === currentPage + 2 && currentPage < totalPages - 2)
                                  ) {
                                    return (
                                      <span
                                        key={pageNumber}
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-gray-700 dark:text-gray-300"
                                      >
                                        ...
                                      </span>
                                    );
                                  }
                                  return null;
                                })}
                                
                                <button
                                  onClick={goToNextPage}
                                  disabled={currentPage >= totalPages}
                                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium ${
                                    currentPage >= totalPages
                                      ? 'text-gray-300 dark:text-gray-600'
                                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-600'
                                  }`}
                                >
                                  <span className="sr-only">Next</span>
                                  <ChevronRight className="h-5 w-5" />
                                </button>
                              </nav>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
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
                    currentImageUrl={data?.supervisor?.profilePictureUrl || ""}
                    studentName={data?.supervisor?.fullName || ""}
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
