"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import Image from "next/image";
import {
  LogOut,
  Menu,
  User,
  X,
  Send,
  ThumbsUp,
  CheckCircle,
  Calendar,
  MapPin,
  BookOpen,
  Home,
  Clock,
  School,
  Building2,
  ArrowUp,
  DoorOpen,
  Settings,
  Camera,
  Hash,
  Mail,
} from "lucide-react";
import React from "react";
import { auth } from "@/lib/firebase";
import { signOut, updatePassword, updateProfile } from "firebase/auth";
import ProfileImageUploader from "@/components/ProfileImageUploader";
import { motion, AnimatePresence } from "framer-motion";
import AuthGuard from "@/components/AuthGuard";

interface Post {
  id: number;
  content: string;
  type: "Complaint" | "Maintenance";
  timestamp: Date;
  author: string;
  solved: boolean;
  completeDate?: string;
  hostelDetails?: {
    hostelId: string;
    floor: string;
    roomNumber: string;
    room_id?: string;
  };
  category?: string;
}

interface StudentData {
  fullName: string;
  id: string;
  email: string;
  course: string;
  year: string;
  department: string;
  dateOfOccupancy: string;
  profilePictureUrl: string;
  registrationNumber: string;
  hostel?: string;
  hostelDetails?: {
    hostelId: string;
    floor: string;
    roomNumber: string;
    room_id: string;
  };
}

// Memoized Post Form Component - Fix hostel property
const PostForm = React.memo(
  ({
    onSubmitPost,
    isLoading,
    studentData,
  }: {
    onSubmitPost: (
      content: string,
      type: "Complaint" | "Maintenance",
      hostelDetails: {
        hostelId: string;
        floor: string;
        roomNumber: string;
        room_id?: string;
      },
      category?: string
    ) => Promise<void>;
    isLoading: boolean;
    studentData: StudentData | null;
  }) => {
    const [postContent, setPostContent] = React.useState<string>("");
    const [selectedTag, setSelectedTag] = React.useState<
      "Complaint" | "Maintenance" | ""
    >("");
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [category, setCategory] = React.useState<string>("");

    // Get hostel details from student data
    const hostelDetails = React.useMemo(() => {
      if (!studentData) return null;

      // Use hostelDetails object or extract from room
      const hostelId = studentData.hostelDetails?.hostelId || "";
      const floor = studentData.hostelDetails?.floor || "";
      const roomNumber = studentData.hostelDetails?.roomNumber || "";
      const room_id = studentData.hostelDetails?.room_id || "";

      return {
        hostelId,
        floor,
        roomNumber,
        room_id,
      };
    }, [studentData]);

    const handleSubmit = async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      if (!postContent.trim() || !selectedTag || !hostelDetails) {
        alert("Please fill in all required fields.");
        return;
      }

      try {
        await onSubmitPost(
          postContent,
          selectedTag,
          hostelDetails,
          selectedTag === "Maintenance" ? category : undefined
        );
        setPostContent("");
        setSelectedTag("");
        setCategory("");
        setIsExpanded(false);
      } catch (error) {
        console.error("Error posting:", error);
      }
    };

    return (
      <motion.div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <form className="w-full" onSubmit={handleSubmit}>
          <div
            className={`
              transition-all duration-300 ease-in-out
              ${isExpanded ? "py-4 px-4 sm:py-5 sm:px-5" : "p-3 sm:p-4"}
            `}
          >
            <div className="flex items-center relative border-b dark:border-slate-700 pb-2">
              <input
                type="text"
                placeholder="Share your thoughts, complaints or maintenance requests..."
                className="w-full py-2 bg-transparent outline-none text-sm md:text-base text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                onFocus={() => setIsExpanded(true)}
              />
            </div>

            <AnimatePresence>
              {(isExpanded || postContent) && (
                <motion.div
                  className="mt-3 flex flex-col gap-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex flex-wrap items-center gap-2 w-full">
                    <button
                      type="button"
                      className={`flex items-center justify-center gap-1 border-0 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        selectedTag === "Complaint"
                          ? "bg-red-500 text-white"
                          : "bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20"
                      }`}
                      onClick={() => setSelectedTag("Complaint")}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          selectedTag === "Complaint"
                            ? "bg-white"
                            : "bg-red-500"
                        }`}
                      ></span>
                      Complaint
                    </button>
                    <button
                      type="button"
                      className={`flex items-center justify-center gap-1 border-0 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        selectedTag === "Maintenance"
                          ? "bg-blue-500 text-white"
                          : "bg-blue-50 dark:bg-blue-500/10 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-500/20"
                      }`}
                      onClick={() => setSelectedTag("Maintenance")}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          selectedTag === "Maintenance"
                            ? "bg-white"
                            : "bg-blue-500"
                        }`}
                      ></span>
                      Maintenance
                    </button>
                  </div>

                  {/* Display readonly hostel details */}
                  {hostelDetails && (
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-700/30 rounded-md">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Your submission will be assigned to:
                      </p>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 rounded shadow-sm">
                          <Building2 size={14} className="text-indigo-500" />
                          {hostelDetails.hostelId}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 rounded shadow-sm">
                          <ArrowUp size={14} className="text-indigo-500" />
                          Floor: {hostelDetails.floor}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 rounded shadow-sm">
                          <DoorOpen size={14} className="text-indigo-500" />
                          Room: {hostelDetails.roomNumber}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Maintenance Category Dropdown */}
                  {selectedTag === "Maintenance" && (
                    <div className="mt-2">
                      <select
                        className="w-full p-2 text-sm bg-gray-50 dark:bg-slate-700 rounded-md border border-gray-200 dark:border-slate-600"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                      >
                        <option value="">Select Maintenance Category</option>
                        <option value="electrical">Electrical</option>
                        <option value="plumbing">Plumbing</option>
                        <option value="furniture">Furniture</option>
                        <option value="cleaning">Cleaning</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  )}

                  <div className="flex gap-2 w-full sm:w-auto mt-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsExpanded(false);
                        setPostContent("");
                        setSelectedTag("");
                        setCategory("");
                      }}
                      className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`flex items-center justify-center gap-1 px-4 py-1.5 rounded-md text-xs font-medium text-white transition-all ${
                        postContent.trim() !== "" &&
                        selectedTag !== "" &&
                        hostelDetails &&
                        (selectedTag !== "Maintenance" || category)
                          ? "bg-indigo-500 hover:bg-indigo-600"
                          : "bg-gray-400 opacity-70 cursor-not-allowed"
                      }`}
                      disabled={
                        postContent.trim() === "" ||
                        selectedTag === "" ||
                        !hostelDetails ||
                        (selectedTag === "Maintenance" && !category) ||
                        isLoading
                      }
                    >
                      {isLoading ? (
                        <span className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-3 w-3 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Posting...
                        </span>
                      ) : (
                        <>
                          Post <Send size={12} />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>
      </motion.div>
    );
  }
);
PostForm.displayName = "PostForm";

// Memoized Posts List Component
const PostsList = React.memo(
  ({
    posts,
    studentData,
    isLoading,
  }: {
    posts: Post[];
    studentData: StudentData | null;
    isLoading: boolean;
  }) => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <MessageSkeleton />
          <MessageSkeleton />
          <MessageSkeleton />
        </div>
      );
    }

    if (posts.length === 0) {
      return (
        <motion.div
          className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
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
              No posts yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Share your thoughts, complaints, or maintenance requests using the
              form above.
            </p>
          </div>
        </motion.div>
      );
    }

    return (
      <div className="space-y-6">
        {posts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 * (index % 5) }}
          >
            <MessageBox post={post} studentData={studentData} />
          </motion.div>
        ))}
      </div>
    );
  }
);
PostsList.displayName = "PostsList";

export default function StudentDashboard() {
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [studentData, setStudentData] = React.useState<StudentData | null>(
    null
  );
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isPostLoading, setIsPostLoading] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = React.useState<
    "feed" | "room" | "roommate"
  >("feed");

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        alert("Signed out successfully");
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
    if (studentData) {
      const nameParts = studentData.fullName.split(" ");
      setFirstName(nameParts[0] || "");
      setLastName(nameParts.slice(1).join(" ") || "");
    }
    setIsModalOpen(true);
    setIsMenuOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewPassword("");
    setConfirmPassword("");
    setImageFile(null);
    setPreviewImage(null);
  };

  const handleImageUploaded = async (imageUrl: string) => {
    if (auth.currentUser) {
      console.log("Image uploaded, updating profile with URL:", imageUrl);

      await updateProfile(auth.currentUser, {
        photoURL: imageUrl,
      });

      if (studentData) {
        console.log("Updating local student data with new profile image");
        setStudentData({
          ...studentData,
          profilePictureUrl: imageUrl,
        });
      }

      fetchStudentData();
    }
  };

  const fetchStudentData = async () => {
    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("No user logged in");
        return;
      }

      const token = await user.getIdToken(true);
      console.log("Token obtained successfully");

      // Fetch basic student profile data
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
        throw new Error(errorData.error || "Failed to fetch student data");
      }

      const data = await response.json();
      console.log("Student data received:", data.student);
      setStudentData(data.student);

      // Fetch all student's issues using the new dedicated endpoint
      const issuesResponse = await fetch("/api/issue/all-issues", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!issuesResponse.ok) {
        console.error("Error fetching issues:", await issuesResponse.text());
        throw new Error("Failed to fetch issues data");
      }

      const issuesData = await issuesResponse.json();
      const allIssues = issuesData.maintenanceIssues || [];

      // Format the issues for display
      const formattedPosts = allIssues.map((issue: any) => {
        // Prefer issue.hostelId, issue.floor, etc. if available, else fallback to studentData
        const hostelId =
          issue.hostelId ||
          data.student?.hostel ||
          data.student?.hostelDetails?.hostelId ||
          data.student?.room?.split("-")[0] ||
          "";
        const floor =
          issue.floor ||
          data.student?.floor ||
          data.student?.hostelDetails?.floor ||
          "";
        const roomNumber =
          issue.room ||
          issue.roomNumber ||
          issue.studentRoom ||
          data.student?.hostelDetails?.roomNumber ||
          data.student?.room ||
          "";
        const room_id =
          issue.room_id ||
          data.student?.hostelDetails?.room_id ||
          data.student?.room ||
          "";

        const hostelDetails = {
          hostelId,
          floor,
          roomNumber,
          room_id,
        };

        return {
          id: issue.id,
          content: issue.message,
          type: normalizePostType(issue.type),
          timestamp: new Date(issue.timestamp),
          author: data.student?.name || "You",
          likes: issue.likes || 0,
          solved: issue.solved || issue.isSolved || false,
          completeDate: issue.completeDate || null,
          hostelDetails,
          category: issue.category,
        };
      });

      // Sort posts by timestamp (newest first)
      formattedPosts.sort(
        (a: Post, b: Post) => b.timestamp.getTime() - a.timestamp.getTime()
      );

      setPosts(formattedPosts);
      console.log("Posts loaded:", formattedPosts.length);
    } catch (error) {
      console.error("Error fetching student data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const normalizePostType = (type: string): "Complaint" | "Maintenance" => {
    if (typeof type !== "string") return "Complaint"; // Default fallback

    const lowerType = type.toLowerCase();

    if (lowerType === "maintenance") return "Maintenance";
    return "Complaint"; // Default to Complaint if not maintenance
  };

  const completeProfileUpdate = async (
    updateData: Record<string, any>,
    user: any
  ) => {
    if (Object.keys(updateData).length > 0) {
      console.log("Sending update data to API:", updateData);

      try {
        const token = await user.getIdToken(true);
        const response = await fetch("/api/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          let errorMsg = `Server responded with status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
          } catch (parseError) {
            errorMsg = response.statusText || errorMsg;
          }
          throw new Error(errorMsg);
        }

        const text = await response.text();
        if (!text) {
          console.log("Server returned empty response");
        } else {
          const result = JSON.parse(text);
          console.log("Profile update result:", result);
        }
      } catch (fetchError) {
        console.error("API request error:", fetchError);
        const errorMessage =
          fetchError instanceof Error ? fetchError.message : "Unknown error";
        throw new Error(`Failed to update profile: ${errorMessage}`);
      }
    } else {
      console.log("No fields to update in the database");
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    if (e) {
      e?.preventDefault();
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        alert("User not logged in.");
        return;
      }

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          alert("Passwords don't match.");
          return;
        }
        if (newPassword.length < 8) {
          alert("Password should be at least 8 characters.");
          return;
        }
      }

      setIsLoading(true);

      const updateData: Record<string, any> = {};

      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName && fullName !== studentData?.fullName) {
        updateData.name = fullName;

        await updateProfile(user, { displayName: fullName });
      }

      if (newPassword) {
        await updatePassword(user, newPassword);
      }

      if (Object.keys(updateData).length > 0) {
        await completeProfileUpdate(updateData, user);
      }

      alert("Profile updated successfully!");
      handleCloseModal();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      alert(
        `Failed to update profile: ${error.message || "Try logging in again."}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
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

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchStudentData();
      } else {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSubmitPost = React.useCallback(
    async (
      content: string,
      type: "Complaint" | "Maintenance",
      hostelDetails: {
        hostelId: string;
        floor: string;
        roomNumber: string;
        room_id?: string;
      },
      category?: string
    ) => {
      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error("User not logged in.");
        }

        setIsPostLoading(true);
        const token = await user.getIdToken();

        const response = await fetch("/api/create-issues", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content,
            type: type.toLowerCase(),
            hostelDetails,
            category: type === "Maintenance" ? category : undefined,
          }),
        });

        const responseText = await response.text();
        let responseData;

        try {
          if (responseText.trim()) {
            responseData = JSON.parse(responseText);
          } else {
            responseData = { error: "Empty response from server" };
          }
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          throw new Error(
            "Error processing server response. Please try again."
          );
        }

        if (!response.ok) {
          console.error("API Error:", responseData);
          throw new Error(
            `Failed to create post: ${responseData.error || "Unknown error"}`
          );
        }

        console.log("Post created:", responseData);

        const postId =
          responseData.postId || responseData.issueId || Date.now();
        const newPost = {
          id: postId,
          content,
          type,
          timestamp: new Date(),
          author: studentData?.fullName || "You",
          likes: 0,
          solved: false,
          hostelDetails,
          category: type === "Maintenance" ? category : undefined,
        };

        setPosts((prevPosts) => [newPost, ...prevPosts]);
        return Promise.resolve();
      } catch (error) {
        console.error("Error creating post:", error);
        alert(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred."
        );
        return Promise.reject(error);
      } finally {
        setIsPostLoading(false);
      }
    },
    [studentData]
  );

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900 dark:text-white">
        {/* Profile Header - Restructured for better responsive positioning */}
        <div className="bg-white dark:bg-slate-800 shadow-md mb-6 md:mb-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            {/* Absolutely positioned menu controls for mobile */}
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
              {isLoading ? (
                <ProfileSkeleton />
              ) : (
                <>
                  <div className="relative">
                    <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-700 bg-white dark:bg-slate-700 shadow-md flex-shrink-0">
                      <Image
                        src={studentData?.profilePictureUrl || "/boy.png"}
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
                          {studentData?.fullName || ""}
                        </h2>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300">
                            Student
                          </span>
                          <h3 className="text-sm text-gray-600 dark:text-gray-400">
                            {studentData?.registrationNumber || ""}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex items-center justify-center md:justify-start gap-1.5">
                          <span className="inline-block w-4 h-4">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                          </span>
                          {studentData?.email || ""}
                        </p>
                      </div>

                      {/* Desktop menu controls - hidden on mobile */}
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

                    <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-3 mt-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                        <School size={16} className="text-indigo-500" />
                        <span className="text-xs md:text-sm font-medium">
                          {studentData?.hostelDetails?.hostelId}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                        <BookOpen size={16} className="text-indigo-500" />
                        <span className="text-xs md:text-sm font-medium">
                          {studentData?.course} {studentData?.year}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                        <Home size={16} className="text-indigo-500" />
                        <span className="text-xs md:text-sm font-medium">
                          {studentData?.hostelDetails?.room_id || ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content - Better padding for small screens */}
        <div className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 lg:px-6 pb-8">
          <div className="w-full">
            {/* Tab Navigation */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md mb-6 overflow-hidden">
              <div className="flex">
                <button
                  onClick={() => setActiveTab("feed")}
                  className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors relative ${
                    activeTab === "feed"
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
                >
                  Feed
                  {activeTab === "feed" && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                      layoutId="tabIndicator"
                    />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("room")}
                  className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors flex items-center justify-center gap-1 relative ${
                    activeTab === "room"
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
                >
                  <Camera size={16} />
                  Room Photo
                  {activeTab === "room" && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                      layoutId="tabIndicator"
                    />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("roommate")}
                  className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors flex items-center justify-center gap-1 relative ${
                    activeTab === "roommate"
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
                >
                  <User size={16} />
                  Roommate
                  {activeTab === "roommate" && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                      layoutId="tabIndicator"
                    />
                  )}
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-4 md:space-y-6">
              {activeTab === "feed" ? (
                <>
                  <PostForm
                    onSubmitPost={handleSubmitPost}
                    isLoading={isPostLoading}
                    studentData={studentData}
                  />

                  <PostsList
                    posts={posts}
                    studentData={studentData}
                    isLoading={isLoading}
                  />
                </>
              ) : activeTab === "room" ? (
                <RoomPhotoTab studentData={studentData} />
              ) : (
                <RoommateTab studentData={studentData} />
              )}
            </div>
          </div>
        </div>

        {/* Modal - unchanged */}
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
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative"
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
                  <h2 className="text-2xl font-bold mb-6 sm:mb-8 dark:text-white flex items-center gap-2">
                    <User size={24} className="text-indigo-500" />
                    Edit Profile
                  </h2>

                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="mb-6 sm:mb-8">
                      <ProfileImageUploader
                        currentImageUrl={studentData?.profilePictureUrl || ""}
                        studentName={studentData?.fullName || ""}
                        roomNumber={studentData?.hostelDetails?.room_id || ""}
                        onImageUploaded={handleImageUploaded}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave blank to keep current password"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Leave blank to keep current password"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-colors"
                      >
                        {isLoading ? (
                          <span className="flex items-center justify-center">
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Saving...
                          </span>
                        ) : (
                          "Save Changes"
                        )}
                      </button>
                    </div>
                  </form>
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

const MessageSkeleton = () => {
  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-lg animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
        <div className="flex-1">
          <div className="h-5 w-32 bg-gray-200 dark:bg-slate-700 rounded-md"></div>
          <div className="h-4 w-24 bg-gray-200 dark:bg-slate-700 rounded-md mt-2"></div>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-4 w-full bg-gray-200 dark:bg-slate-700 rounded-md"></div>
        <div className="h-4 w-5/6 bg-gray-200 dark:bg-slate-700 rounded-md mt-2"></div>
        <div className="h-4 w-4/6 bg-gray-200 dark:bg-slate-700 rounded-md mt-2"></div>

        <div className="mt-5 pt-4 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 sm:gap-0 border-t border-gray-100 dark:border-slate-700">
          <div className="h-6 w-24 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="h-6 w-16 bg-gray-200 dark:bg-slate-700 rounded-md"></div>
            <div className="h-6 w-28 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MessageBoxProps {
  post: Post;
}

const MessageBox: React.FC<
  MessageBoxProps & { studentData: StudentData | null }
> = ({ post, studentData }) => {
  const [isSolved, setIsSolved] = React.useState<boolean>(post.solved);
  const [isLiked, setIsLiked] = React.useState<boolean>(false);
  const [isUpdating, setIsUpdating] = React.useState<boolean>(false);
  const [updateError, setUpdateError] = React.useState<string | null>(null);
  const [completionDate, setCompletionDate] = React.useState<string | null>(
    post.completeDate || null
  );

  const toggleSolvedStatus = async () => {
    try {
      setIsUpdating(true);
      setUpdateError(null);

      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not logged in");
      }

      const token = await user.getIdToken();
      const newStatus = !isSolved;
      const newCompletionDate = newStatus ? new Date().toISOString() : null;

      const response = await fetch("/api/issue/update-issue", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          issueId: post.id,
          solved: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update issue status");
      }

      // Update local state
      setIsSolved(newStatus);
      setCompletionDate(newCompletionDate);
      console.log(`Issue marked as ${newStatus ? "solved" : "unsolved"}`);
    } catch (error) {
      console.error("Error updating issue status:", error);
      setUpdateError(
        error instanceof Error ? error.message : "Failed to update status"
      );
      setIsSolved(post.solved); // Revert to original state
      setCompletionDate(post.completeDate || null); // Convert undefined to null
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (date: Date): string => {
    if (!(date instanceof Date)) return "";
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      if (diffInHours === 0) {
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
      }
      return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  React.useEffect(() => {
    // Keep local state in sync with prop changes
    setIsSolved(post.solved);
    setCompletionDate(post.completeDate || null);
  }, [post.solved, post.completeDate]);

  return (
    <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-xl shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-gray-100 dark:ring-slate-700">
          <Image
            src={studentData?.profilePictureUrl || "/boy.png"}
            width={50}
            height={50}
            alt="profile"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h3 className="font-medium text-gray-800 dark:text-white text-sm md:text-base">
            {post.author}
          </h3>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            {formatDate(post.timestamp)}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-gray-700 dark:text-gray-300 text-sm md:text-base">
          {post.content}
        </p>

        {/* Ensure hostelDetails is always displayed, falling back to studentData if needed */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1">
            <Building2 size={12} />
            {post.hostelDetails?.hostelId ||
              studentData?.hostelDetails?.hostelId ||
              ""}
          </span>
          <span className="inline-flex items-center gap-1">
            <ArrowUp size={12} />
            Floor:{" "}
            {post.hostelDetails?.floor ||
              studentData?.hostelDetails?.floor ||
              ""}
          </span>
          <span className="inline-flex items-center gap-1">
            <DoorOpen size={12} />
            Room:{" "}
            {post.hostelDetails?.roomNumber ||
              studentData?.hostelDetails?.roomNumber ||
              ""}
          </span>
          {post.type === "Maintenance" && post.category && (
            <span className="inline-flex items-center gap-1">
              <Settings size={12} />
              Category: {post.category}
            </span>
          )}
        </div>

        <div className="mt-4 pt-3 flex flex-wrap items-start justify-between gap-2 sm:gap-0 border-t border-gray-100 dark:border-slate-700">
          <span
            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
              post.type === "Maintenance"
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300"
                : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300"
            }`}
          >
            {post.type === "Maintenance" ? (
              <svg
                className="w-3.5 h-3.5 mr-1"
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
                className="w-3.5 h-3.5 mr-1"
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
            {post.type}
          </span>
          <div className="flex flex-col items-end gap-1">
            {isSolved && completionDate && (
              <div className="text-xs text-green-600 dark:text-green-400">
                Completed: {new Date(completionDate).toLocaleDateString()}
              </div>
            )}

            <div className="flex items-center gap-2">
              {updateError && (
                <span className="text-xs text-red-500 dark:text-red-400">
                  {updateError}
                </span>
              )}
              <button
                onClick={toggleSolvedStatus}
                disabled={isUpdating}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                  isUpdating
                    ? "bg-gray-100 dark:bg-gray-700 opacity-60 cursor-wait"
                    : isSolved
                    ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-300"
                }`}
              >
                {isUpdating ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-0.5 mr-1.5 h-3 w-3"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Updating...
                  </span>
                ) : (
                  <>
                    <CheckCircle
                      size={14}
                      className={
                        isSolved ? "fill-green-600 dark:fill-green-300" : ""
                      }
                    />
                    {isSolved ? "Solved" : "Mark as Solved"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Room Photo Tab Component
const RoomPhotoTab = React.memo(
  ({ studentData }: { studentData: StudentData | null }) => {
    const hostelNumber = studentData?.hostelDetails?.hostelId || "";
    const roomNumber = studentData?.hostelDetails?.roomNumber || "";

    return (
      <motion.div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex flex-col space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <Camera size={20} className="text-indigo-500" />
            Room Photo: {roomNumber}
          </h2>

          <div className="relative w-full h-[300px] sm:h-[400px] md:h-[500px] overflow-hidden rounded-lg">
            <Image
              src="/room-placeholder.jpeg"
              alt={`Room ${roomNumber} photo`}
              fill
              className="object-cover"
            />
            <div className="absolute bottom-4 right-4 bg-black/70 px-3 py-1.5 rounded-lg text-white text-sm">
              Hostel {hostelNumber}, Room {roomNumber}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-300">
            <p className="mb-2">
              This is a placeholder room photo. In the actual implementation,
              this could:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Display the most recent image of your room from inspections
              </li>
              <li>
                Allow you to upload your own photos for maintenance requests
              </li>
              <li>Show historical room condition for documentation</li>
            </ul>
          </div>
        </div>
      </motion.div>
    );
  }
);
RoomPhotoTab.displayName = "RoomPhotoTab";

// Roommate Tab Component
const RoommateTab = React.memo(
  ({ studentData }: { studentData: StudentData | null }) => {
    const [roommates, setRoommates] = React.useState<StudentData[]>([]);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
      const fetchRoommates = async () => {
        if (!studentData?.hostelDetails?.room_id) {
          setIsLoading(false);
          setError("Room information not available");
          return;
        }

        try {
          const user = auth.currentUser;
          if (!user) {
            setError("User not logged in");
            setIsLoading(false);
            return;
          }

          const token = await user.getIdToken(true);

          // Create API endpoint URL with query parameters
          const roommateUrl = new URL("/api/roommate", window.location.origin);
          roommateUrl.searchParams.append(
            "hostelId",
            studentData.hostelDetails.hostelId
          );
          roommateUrl.searchParams.append(
            "roomId",
            studentData.hostelDetails.room_id
          );
          roommateUrl.searchParams.append(
            "userId",
            studentData.id // Send current user ID to exclude from results
          );

          const response = await fetch(roommateUrl.toString(), {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error("Failed to fetch roommate data");
          }

          const data = await response.json();
          setRoommates(data.students || []);
        } catch (error) {
          console.error("Error fetching roommates:", error);
          setError(error instanceof Error ? error.message : "Unknown error");
        } finally {
          setIsLoading(false);
        }
      };

      fetchRoommates();
    }, [studentData]);

    // Show loading state
    if (isLoading) {
      return (
        <motion.div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
          <div className="animate-pulse flex flex-col space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gray-200 dark:bg-slate-700"></div>
              <div className="flex-1 space-y-4">
                <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    // Show error state
    if (error) {
      return (
        <motion.div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
          <div className="flex flex-col items-center justify-center py-10">
            <User className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-2">
              Error loading roommate
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              {error}
            </p>
          </div>
        </motion.div>
      );
    }

    // Show empty state when no roommates found
    if (roommates.length === 0) {
      return (
        <motion.div
          className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex flex-col items-center justify-center py-10">
            <User className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-2">
              No roommate found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              You don't seem to have a roommate assigned to your room at this
              time.
            </p>
          </div>
        </motion.div>
      );
    }

    // Show roommates
    return (
      <motion.div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex flex-col space-y-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <User size={20} className="text-indigo-500" />
            {roommates.length > 1 ? "Your Roommates" : "Your Roommate"}
          </h2>

          {roommates.map((roommate) => (
            <div
              key={roommate.id}
              className="flex flex-col sm:flex-row gap-5 border-b border-gray-100 dark:border-slate-700 pb-6 last:border-0 last:pb-0"
            >
              {/* Profile Image */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-700 bg-white dark:bg-slate-700 shadow-md">
                  <Image
                    src={roommate.profilePictureUrl || "/boy.png"}
                    width={150}
                    height={150}
                    alt="Roommate Profile"
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                  {roommate.fullName}
                </h3>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <School
                        size={16}
                        className="text-indigo-600 dark:text-indigo-400"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        Course
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        {roommate.course} {roommate.year}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <Hash
                        className="text-green-600 dark:text-green-400"
                        size={16}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        Registration Number
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        {roommate.registrationNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail
                        className="text-indigo-600 dark:text-indigo-400"
                        size={16}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        Email
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        {roommate.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }
);
RoommateTab.displayName = "RoommateTab";
