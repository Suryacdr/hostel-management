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
  School,
  Clock,
  CircleDotDashed,
  CheckCheck,
  ArrowUp,
  DoorOpen,
  Settings,
} from "lucide-react";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";
import ProfileImageUploader from "@/components/ProfileImageUploader";
import { signOut, updateProfile } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import AuthGuard from "@/components/AuthGuard";

interface StaffMember {
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  assignedHostel?: string;
  assignedFloors?: string[];
  reportsTo?: string;
  profilePictureUrl?: string;
}

interface DashboardData {
  hostels: any[];
  complaints?: any[];
  maintenance?: any[];
  issues: any[];
  supervisors?: StaffMember[];
  hostel_wardens?: StaffMember[];
  floor_wardens?: StaffMember[];
  floor_attendants?: StaffMember[];
}

interface ChiefWardenProfile {
  fullName: string;
  email: string;
  role: string;
  profilePictureUrl?: string;
  accessLevel: string;
  assignedHostels: string[];
}

export default function ChiefWarden() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [profileData, setProfileData] = useState<ChiefWardenProfile | null>(
    null
  );
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

        setProfileData((prev) =>
          prev
            ? {
                ...prev,
                profilePictureUrl: imageUrl,
              }
            : null
        );

        fetchDashboardData();
      } catch (error) {
        console.error("Error updating profile picture:", error);
      }
    }
  };

  const fetchDashboardData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("No user logged in");
        return;
      }

      const token = await user.getIdToken(true);
      console.log("Fetching dashboard data with token...");

      const response = await fetch("/api/fetch", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(errorData.error || "Failed to fetch dashboard data");
      }

      const dashboardData = await response.json();
      console.log("Dashboard data received:", dashboardData);
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching dashboard data:", err);
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
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setProfileData({
          fullName: user.displayName || "",
          email: user.email || "",
          role: "Chief Warden",
          profilePictureUrl: user.photoURL || "",
          accessLevel: "all",
          assignedHostels: ["BH1", "BH2"],
        });
        fetchDashboardData();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const renderStaffCards = (
    staffMembers: StaffMember[] = [],
    title: string
  ) => {
    if (!staffMembers || staffMembers.length === 0) {
      return (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">{title}</h2>
          <motion.div
            className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-gray-500 dark:text-gray-400">
              No {title.toLowerCase()} found.
            </p>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffMembers.map((staff, index) => (
            <motion.div
              key={index}
              className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow hover:shadow-md transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * (index % 6) }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    {staff.fullName}
                  </h3>
                  <span className="text-sm text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                    {staff.role
                      ? staff.role
                          .split("_")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(" ")
                      : "Staff Member"}
                  </span>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {staff.email}
                </p>
                <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {staff.phoneNumber}
                </p>
                {staff.assignedHostel && (
                  <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    Hostel: {staff.assignedHostel}
                  </p>
                )}
                {staff.assignedFloors && staff.assignedFloors.length > 0 && (
                  <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Users className="w-4 h-4 text-gray-400" />
                    Floors: {staff.assignedFloors.join(", ")}
                  </p>
                )}
                {staff.reportsTo && (
                  <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Reports to: {staff.reportsTo}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

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
                    <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-700 bg-white dark:bg-slate-700 shadow-md flex-shrink-0">
                      <Image
                        src={profileData?.profilePictureUrl || "/boy.png"}
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
                          {profileData?.fullName || "Chief Warden"}
                        </h2>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300">
                            {profileData?.role || "Chief Warden"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex items-center justify-center md:justify-start gap-1.5">
                          <Mail className="w-4 h-4" />
                          {profileData?.email || ""}
                        </p>
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
                        <Building2 size={16} className="text-purple-500" />
                        <span className="text-xs md:text-sm font-medium">
                          {data?.hostels?.length || 0} Hostels
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                        <CircleDotDashed
                          size={16}
                          className="text-yellow-500"
                        />
                        <span className="text-xs md:text-sm font-medium">
                          {data?.issues?.filter((issue) => !issue.solved)
                            ?.length || 0}{" "}
                          Pending Issues
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                        <CheckCheck size={16} className="text-green-500" />
                        <span className="text-xs md:text-sm font-medium">
                          {(data?.issues?.length || 0) -
                            (data?.issues?.filter((issue) => !issue.solved)
                              ?.length || 0)}{" "}
                          Resolved
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-7xl w-full mx-auto px-4 pb-8">
          {renderStaffCards(data?.supervisors, "Supervisors")}
          {renderStaffCards(data?.hostel_wardens, "Hostel Wardens")}
          {renderStaffCards(data?.floor_wardens, "Floor Wardens")}
          {renderStaffCards(data?.floor_attendants, "Floor Attendants")}

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Hostels Overview</h2>
            {data?.hostels && data.hostels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.hostels.map((hostel, index) => (
                  <motion.div
                    key={hostel.id}
                    className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow hover:shadow-md transition-shadow"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 * (index % 6) }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                          {hostel.name}
                        </h3>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2.5">
                      <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        Total Floors: {hostel.totalFloors}
                      </p>
                      <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Users className="w-4 h-4 text-gray-400" />
                        Total Rooms: {hostel.totalRooms}
                      </p>
                      <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <User className="w-4 h-4 text-gray-400" />
                        Warden: {hostel.warden}
                      </p>
                      <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <User className="w-4 h-4 text-gray-400" />
                        Supervisor: {hostel.supervisor}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-gray-500 dark:text-gray-400">
                  No hostels found.
                </p>
              </motion.div>
            )}
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Recent Issues</h2>
            {data?.issues && data.issues.length > 0 ? (
              <div className="space-y-4">
                {data.issues.slice(0, 10).map((issue: any, index) => (
                  <motion.div
                    key={issue.id || index}
                    className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-xl shadow-md hover:shadow-lg transition-shadow"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 * (index % 5) }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 
                      ${
                        issue.type === "maintenance"
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                      }`}
                      >
                        {issue.type === "maintenance" ? (
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
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
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
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-800 dark:text-white text-sm md:text-base">
                              {issue.studentName || "Student"}
                            </h3>
                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                              <Clock size={12} className="mr-1" />
                              {new Date(issue.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              issue.solved
                                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
                            }`}
                          >
                            {issue.solved ? "Resolved" : "Pending"}
                          </span>
                        </div>
                        <div className="mt-2">
                          <p className="text-gray-700 dark:text-gray-300 text-sm md:text-base">
                            {issue.message}
                          </p>

                          {issue.hostelDetails && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-1">
                                <Building2 size={12} />
                                {issue.hostelDetails.hostel}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <ArrowUp size={12} />
                                Floor: {issue.hostelDetails.floor}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <DoorOpen size={12} />
                                Room: {issue.hostelDetails.roomNumber}
                              </span>
                              {issue.type === "maintenance" && issue.category && (
                                <span className="inline-flex items-center gap-1">
                                  <Settings size={12} />
                                  Category: {issue.category}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="mt-3 pt-3 flex justify-between items-center border-t border-gray-100 dark:border-slate-700">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                issue.type === "maintenance"
                                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300"
                                  : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300"
                              }`}
                            >
                              {issue.type === "maintenance"
                                ? "Maintenance"
                                : "Complaint"}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ID:{" "}
                              {issue.id
                                ? String(issue.id).substring(0, 8) + "..."
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
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
                    There are currently no reported issues or complaints.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
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
                    <User size={24} className="text-purple-500" />
                    Edit Profile
                  </h2>

                  <ProfileImageUploader
                    currentImageUrl={profileData?.profilePictureUrl || ""}
                    studentName={profileData?.fullName || ""}
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
      <div className="w-32 h-32 md:w-36 md:h-36 rounded-full bg-gray-200 dark:bg-slate-700 flex-shrink-0 animate-pulse"></div>
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
