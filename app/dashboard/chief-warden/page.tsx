"use client";

import { useEffect, useState } from "react";
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
  Search,
} from "lucide-react";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";
import ProfileImageUploader from "@/components/ProfileImageUploader";
import { signOut, updateProfile } from "firebase/auth";
import SearchModal from "@/components/SearchModal";

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
  const [menuRef, setMenuRef] = useState<HTMLDivElement | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

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

        // Force a refresh of the dashboard data
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

      // Ensure all expected arrays exist in the data
      const processedData = {
        ...dashboardData,
        hostels: dashboardData.hostels || [],
        supervisors: dashboardData.supervisors || [],
        hostel_wardens: dashboardData.hostel_wardens || [],
        floor_wardens: dashboardData.floor_wardens || [],
        floor_attendants: dashboardData.floor_attendants || [],
        issues: dashboardData.issues || [],
      };

      setData(processedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef && !menuRef.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // Set initial profile data from auth user
        setProfileData({
          fullName: user.displayName || "",
          email: user.email || "",
          role: "Chief Warden",
          profilePictureUrl: user.photoURL || "",
          accessLevel: "all",
          assignedHostels: ["All Hostels"],
        });
        fetchDashboardData();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  const totalIssues = data?.issues?.length || 0;
  const pendingIssues =
    data?.issues?.filter((issue) => !issue.solved)?.length || 0;
  const resolvedIssues = totalIssues - pendingIssues;

  // Helper function to render staff cards
  const renderStaffCards = (
    staffMembers: StaffMember[] = [],
    title: string
  ) => {
    console.log(`Rendering ${title}:`, staffMembers);

    if (!staffMembers || staffMembers.length === 0) {
      return (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">{title}</h2>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No {title.toLowerCase()} found.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffMembers.map((staff, index) => {
            // Ensure we have the required fields, using fallbacks if needed
            const fullName = staff.fullName || "Unknown";
            const email = staff.email || "No email provided";
            const phoneNumber = staff.phoneNumber || "No phone provided";
            const role = staff.role || "Staff Member";
            const assignedHostel = staff.assignedHostel;
            const assignedFloors = staff.assignedFloors || [];
            const reportsTo = staff.reportsTo || "";

            return (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {fullName}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400 mt-1 block">
                      {role
                        ? role
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
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Mail className="w-4 h-4" />
                    {email}
                  </p>
                  <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Phone className="w-4 h-4" />
                    {phoneNumber}
                  </p>
                  {assignedHostel && (
                    <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <Building2 className="w-4 h-4" />
                      Hostel: {assignedHostel}
                    </p>
                  )}
                  {assignedFloors && assignedFloors.length > 0 && (
                    <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <Users className="w-4 h-4" />
                      Floors: {assignedFloors.join(", ")}
                    </p>
                  )}
                  {reportsTo && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Reports to: {reportsTo}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950 dark:text-white">
      {/* Profile Header */}
      <div className="bg-white dark:bg-slate-900 shadow-md rounded-b-3xl mb-6">
        <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-8">
          <div className="w-28 h-28 md:w-40 md:h-40 rounded-full overflow-hidden ring-4 ring-gray-100 dark:ring-slate-800 flex-shrink-0">
            <Image
              src={profileData?.profilePictureUrl || "/boy.png"}
              width={200}
              height={200}
              alt="Profile"
              className="object-cover w-full h-full"
            />
          </div>
          <div className="flex-1 w-full md:w-auto">
            <div className="flex flex-col md:flex-row justify-between items-center md:items-start">
              <div className="text-center md:text-left mb-3 md:mb-0">
                <h2 className="text-2xl md:text-3xl font-bold">
                  {profileData?.fullName || "Chief Warden"}
                </h2>
                <h3 className="text-lg md:text-xl text-gray-600 dark:text-gray-400">
                  {profileData?.role}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  {profileData?.email}
                </p>
              </div>
              <div className="flex items-center gap-3 relative mt-2 md:mt-0">
                <ThemeToggle />
                <button
                  onClick={() => setIsSearchModalOpen(true)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <Search size={20} />
                </button>
                <button
                  onClick={handleMenuOpen}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <Menu size={20} />
                </button>
                {isMenuOpen && (
                  <div
                    ref={setMenuRef}
                    className="w-[180px] p-2 absolute bg-white dark:bg-slate-800 top-12 right-0 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 flex flex-col gap-2 z-50"
                  >
                    <button
                      className="inline-flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-700 dark:text-gray-200 transition-colors"
                      onClick={handleOpenEditModal}
                    >
                      <User size={18} />
                      <span className="text-sm font-medium">Edit Profile</span>
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="inline-flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-red-500 transition-colors"
                    >
                      <LogOut size={18} />
                      <span className="text-sm font-medium">Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 md:gap-4 mt-4 md:mt-6">
              <div className="bg-gray-100 dark:bg-slate-800 p-2 md:p-3 rounded-xl text-center flex-1 shadow-sm min-w-[100px]">
                <p className="text-lg md:text-xl font-semibold">
                  {data?.hostels?.length || 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Hostels
                </p>
              </div>
              <div className="bg-gray-100 dark:bg-slate-800 p-2 md:p-3 rounded-xl text-center flex-1 shadow-sm min-w-[100px]">
                <p className="text-lg md:text-xl font-semibold text-yellow-500">
                  {pendingIssues}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Pending Issues
                </p>
              </div>
              <div className="bg-gray-100 dark:bg-slate-800 p-2 md:p-3 rounded-xl text-center flex-1 shadow-sm min-w-[100px]">
                <p className="text-lg md:text-xl font-semibold text-green-500">
                  {resolvedIssues}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Resolved Issues
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 pb-8">
        {/* Staff Management Sections */}
        {renderStaffCards(data?.supervisors, "Supervisors")}
        {renderStaffCards(data?.hostel_wardens, "Hostel Wardens")}
        {renderStaffCards(data?.floor_wardens, "Floor Wardens")}
        {renderStaffCards(data?.floor_attendants, "Floor Attendants")}

        {/* Hostels Overview */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Hostels Overview</h2>
          {data?.hostels && data.hostels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.hostels.map((hostel) => (
                <div
                  key={hostel.id}
                  className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow"
                >
                  <h3 className="text-xl font-semibold mb-4">{hostel.name}</h3>
                  <div className="space-y-2">
                    <p className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Total Floors: {hostel.totalFloors}
                    </p>
                    <p className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Total Rooms: {hostel.totalRooms}
                    </p>
                    <p className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Warden: {hostel.warden}
                    </p>
                    <p className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Supervisor: {hostel.supervisor}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No hostels found.
              </p>
            </div>
          )}
        </div>

        {/* Recent Issues */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Recent Issues</h2>
          {data?.issues && data.issues.length > 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {data.issues.map((issue: any) => (
                    <tr key={issue.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {String(issue.id).substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {issue.studentName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {issue.type}
                      </td>
                      <td className="px-6 py-4 text-sm">{issue.message}</td>
                      <td className="px-6 py-4 text-sm">
                        {new Date(issue.timestamp).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            issue.solved
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          }`}
                        >
                          {issue.solved ? "Resolved" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No issues found.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        data={data || {}}
      />

      {/* Edit Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <X size={20} />
            </button>

            <div className="p-6">
              <h2 className="text-xl font-bold mb-6 dark:text-white">
                Edit Profile Photo
              </h2>
              <ProfileImageUploader
                currentImageUrl={profileData?.profilePictureUrl || ""}
                studentName={profileData?.fullName || ""}
                onImageUploaded={handleImageUploaded}
              />
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
