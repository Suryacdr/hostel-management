"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import Image from "next/image";
import { LogOut, Menu, User, X } from "lucide-react";
import React from "react";
import { auth } from "@/lib/firebase";
import { signOut, updatePassword, updateProfile } from "firebase/auth";
import ProfileImageUploader from "@/components/ProfileImageUploader";

interface Post {
  id: number;
  content: string;
  type: "Complaint" | "Maintenance";
  timestamp: Date;
  author: string;
  likes: number;
  solved: boolean;
}

interface StudentData {
  name: string;
  id: string;
  email: string;
  course: string;
  department: string;
  room: string;
  profilePictureUrl: string;
  registrationNumber: string;
}

export default function StudentDashboard() {
  const [postContent, setPostContent] = React.useState<string>("");
  const [selectedTag, setSelectedTag] = React.useState<
    "Complaint" | "Maintenance" | ""
  >("");
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [studentData, setStudentData] = React.useState<StudentData | null>(
    null
  );
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  // Open the edit profile modal
  const handleOpenEditModal = () => {
    if (studentData) {
      const nameParts = studentData.name.split(" ");
      setFirstName(nameParts[0] || "");
      setLastName(nameParts.slice(1).join(" ") || "");
    }
    setIsModalOpen(true);
    setIsMenuOpen(false);
  };

  // Close the modal and reset form
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setNewPassword("");
    setConfirmPassword("");
    setImageFile(null);
    setPreviewImage(null);
  };

  // Handle when an image is successfully uploaded via the ProfileImageUploader
  const handleImageUploaded = async (imageUrl: string) => {
    if (auth.currentUser) {
      console.log("Image uploaded, updating profile with URL:", imageUrl);

      // Update Firebase Auth profile with photo URL
      await updateProfile(auth.currentUser, {
        photoURL: imageUrl,
      });

      // If there's student data available, update it locally
      if (studentData) {
        console.log("Updating local student data with new profile image");
        setStudentData({
          ...studentData,
          profilePictureUrl: imageUrl,
        });
      }

      // Force a refresh of the student data from the server
      fetchStudentData();
    }
  };

  // Extract fetchStudentData to a separate function to reuse it
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
      console.log("Received data:", data);
      // Debug studentData and specifically the registrationNumber field
      console.log("Student data received:", data.student);
      console.log("Registration number:", data.student?.registrationNumber);

      setStudentData(data.student);
      console.log(
        "Updated student data with profile picture:",
        data.student.profilePictureUrl
      );

      // Check for issues array first (new structure)
      const issuesArray = Array.isArray(data.issues) ? data.issues : [];
      
      // Fallback to old structure if issues array is empty
      const complaintsArray = Array.isArray(data.complaints) ? data.complaints : [];
      const maintenanceArray = Array.isArray(data.maintenance) ? data.maintenance : [];
      
      let allPosts = [];
      
      if (issuesArray.length > 0) {
        // Process issues array (new structure)
        allPosts = issuesArray.map((issue: any) => ({
          id: issue.id,
          content: issue.message,
          type: issue.type,
          timestamp: new Date(issue.timestamp),
          author: data.student?.name || "You",
          likes: issue.likes || 0,
          solved: issue.solved || false,
        }));
      } else {
        // Process separate arrays (old structure)
        const formattedComplaints = complaintsArray.map((complaint: any) => ({
          id: complaint.id,
          content: complaint.message,
          type: "Complaint" as const,
          timestamp: new Date(complaint.timestamp),
          author: data.student?.name || "You",
          likes: complaint.likes || 0,
          solved: complaint.solved || false,
        }));

        const formattedMaintenance = maintenanceArray.map((maintenance: any) => ({
          id: maintenance.id,
          content: maintenance.message,
          type: "Maintenance" as const,
          timestamp: new Date(maintenance.timestamp),
          author: data.student?.name || "You",
          likes: maintenance.likes || 0,
          solved: maintenance.solved || false,
        }));

        allPosts = [...formattedComplaints, ...formattedMaintenance];
      }
      
      // Sort posts by timestamp (newest first)
      allPosts.sort((a: Post, b: Post) => b.timestamp.getTime() - a.timestamp.getTime());

      setPosts(allPosts);
      console.log("Posts loaded:", allPosts.length);
    } catch (error) {
      console.error("Error fetching student data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to complete profile update
  const completeProfileUpdate = async (
    updateData: Record<string, any>,
    user: any
  ) => {
    // Make API call if there are any fields to update
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

        // Check if the response is ok before trying to parse it
        if (!response.ok) {
          // Try to get error details if available
          let errorMsg = `Server responded with status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
          } catch (parseError) {
            // If we can't parse the error response, use the status text
            errorMsg = response.statusText || errorMsg;
          }
          throw new Error(errorMsg);
        }

        // Make sure the response has content before parsing
        const text = await response.text();
        if (!text) {
          console.log("Server returned empty response");
          // Continue instead of throwing, since the update might still have succeeded
        } else {
          // Parse JSON only if there's content
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

  // Handle profile update submission
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

      // Update data object to send to the API
      const updateData: Record<string, any> = {};

      // Add name to update data if changed
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName && fullName !== studentData?.name) {
        updateData.name = fullName;

        // Update Firebase Auth profile
        await updateProfile(user, { displayName: fullName });
      }

      // Update password if provided
      if (newPassword) {
        await updatePassword(user, newPassword);
      }

      // Make API call if there are any fields to update
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

  const handlePost = React.useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!postContent.trim() || !selectedTag) {
        alert("Please fill in all fields.");
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) {
            alert("User not logged in.");
            return;
        }

        setIsLoading(true);
        const token = await user.getIdToken();

        const response = await fetch("/api/create-issues", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                content: postContent,
                type: selectedTag.toLowerCase(),
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
            alert("Error processing server response. Please try again.");
            return;
        }

        if (!response.ok) {
            console.error("API Error:", responseData);
            alert(`Failed to create post: ${responseData.error || "Unknown error"}`);
            return;
        }

        console.log("Post created:", responseData);

        const postId = responseData.postId || responseData.issueId || Date.now();
        const newPost = {
            id: postId,
            content: postContent,
            type: selectedTag,
            timestamp: new Date(),
            author: studentData?.name || "You",
            likes: 0,
            solved: false
        };

        setPosts((prevPosts) => [newPost, ...prevPosts]);

        setPostContent("");
        setSelectedTag("");
    } catch (error) {
        console.error("Error creating post:", error);
        alert("An unexpected error occurred.");
    } finally {
        setIsLoading(false);
    }
  }, [postContent, selectedTag, studentData]);
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950 dark:text-white">
      <div className="bg-white dark:bg-slate-900 shadow-md rounded-b-3xl mb-6">
        <div className="max-w-6xl mx-auto p-4 md:p-6 flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-8">
          {isLoading ? (
            <ProfileSkeleton />
          ) : (
            <>
              <div className="w-28 h-28 md:w-40 md:h-40 rounded-full overflow-hidden ring-4 ring-gray-100 dark:ring-slate-800 flex-shrink-0">
                <Image
                  src={studentData?.profilePictureUrl || "/boy.png"}
                  width={200}
                  height={200}
                  alt="Profile"
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="flex-1 w-full md:w-auto">
                <div className="flex flex-col md:flex-row justify-between items-center md:items-start">
                  <div className="text-center md:text-left mb-3 md:mb-0">
                    <h2 className="text-xl md:text-2xl font-bold">
                      {studentData?.name || ""}
                    </h2>
                    <h3 className="text-base md:text-lg text-gray-600 dark:text-gray-400">
                      {studentData?.registrationNumber || ""}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      {studentData?.email || ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 relative mt-2 md:mt-0">
                    <ThemeToggle />
                    <button
                      onClick={handleMenuOpen}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                      <Menu size={20} />
                    </button>
                    {isMenuOpen && (
                      <div
                        ref={menuRef}
                        className="w-[180px] p-2 absolute bg-white dark:bg-slate-800 top-12 right-0 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 flex flex-col gap-2 z-50"
                      >
                        <button
                          className="inline-flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-700 dark:text-gray-200 transition-colors"
                          onClick={handleOpenEditModal}
                        >
                          <User size={18} />
                          <span className="text-sm font-medium">
                            Edit Profile
                          </span>
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
                      {studentData?.course || ""}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Course
                    </p>
                  </div>
                  <div className="bg-gray-100 dark:bg-slate-800 p-2 md:p-3 rounded-xl text-center flex-1 shadow-sm min-w-[100px]">
                    <p className="text-lg md:text-xl font-semibold">
                      {studentData?.department || ""}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Dept
                    </p>
                  </div>
                  <div className="bg-gray-100 dark:bg-slate-800 p-2 md:p-3 rounded-xl text-center flex-1 shadow-sm min-w-[100px]">
                    <p className="text-lg md:text-xl font-semibold">
                      {studentData?.room || ""}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Room
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto px-4 pb-8">
        <div className="w-full">
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm">
              <form className="w-full">
                <div className="bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden">
                  <input
                    type="text"
                    placeholder="Have any complaints or maintenance?"
                    className="w-full p-3 bg-transparent outline-none"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                  />
                </div>
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      className={`border-2 border-red-500 cursor-pointer rounded-xl px-3 sm:px-4 py-2 text-sm font-medium transition-colors ${
                        selectedTag === "Complaint"
                          ? "bg-red-50 dark:bg-red-500/10 text-red-500"
                          : "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                      }`}
                      onClick={() => setSelectedTag("Complaint")}
                    >
                      Complaint
                    </button>
                    <button
                      type="button"
                      className={`border-2 border-blue-500 cursor-pointer rounded-xl px-3 sm:px-4 py-2 text-sm font-medium transition-colors ${
                        selectedTag === "Maintenance"
                          ? "bg-blue-50 dark:bg-blue-500/10 text-blue-500"
                          : "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                      }`}
                      onClick={() => setSelectedTag("Maintenance")}
                    >
                      Maintenance
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handlePost}
                    className={`w-full sm:w-auto px-5 py-2 text-sm text-white cursor-pointer rounded-xl transition-colors ${
                      postContent.trim() !== "" && selectedTag !== ""
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-blue-400 cursor-not-allowed"
                    }`}
                    disabled={
                      postContent.trim() === "" ||
                      selectedTag === "" ||
                      isLoading
                    }
                  >
                    {isLoading ? "Posting..." : "Post"}
                  </button>
                </div>
              </form>
            </div>

            {isLoading ? (
              <>
                <MessageSkeleton />
                <MessageSkeleton />
                <MessageSkeleton />
              </>
            ) : posts.length > 0 ? (
              posts.map((post) => (
                <MessageBox
                  key={post.id}
                  post={post}
                  studentData={studentData}
                />
              ))
            ) : (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  You haven't posted anything yet.
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Share your complaints or maintenance requests above.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <X size={20} />
            </button>

            <div className="p-4 sm:p-6">
              <h2 className="text-xl font-bold mb-4 sm:mb-6 dark:text-white">
                Edit Profile
              </h2>

              <form onSubmit={handleProfileUpdate}>
                <div className="mb-4 sm:mb-6">
                  <ProfileImageUploader
                    currentImageUrl={studentData?.profilePictureUrl || ""}
                    studentName={studentData?.name || ""}
                    roomNumber={studentData?.room}
                    onImageUploaded={handleImageUploaded}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ProfileSkeleton = () => {
  return (
    <>
      <div className="w-28 h-28 md:w-40 md:h-40 rounded-full bg-gray-200 dark:bg-slate-800 flex-shrink-0 animate-pulse"></div>
      <div className="flex-1 w-full">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start">
          <div className="space-y-2 text-center md:text-left">
            <div className="h-7 w-48 bg-gray-200 dark:bg-slate-800 rounded-md animate-pulse mx-auto md:mx-0"></div>
            <div className="h-6 w-32 bg-gray-200 dark:bg-slate-800 rounded-md animate-pulse mx-auto md:mx-0"></div>
            <div className="h-5 w-56 bg-gray-200 dark:bg-slate-800 rounded-md animate-pulse mx-auto md:mx-0"></div>
          </div>
          <div className="flex items-center gap-3 mt-2 md:mt-0">
            <div className="w-10 h-10 bg-gray-200 dark:bg-slate-800 rounded-full animate-pulse"></div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:gap-4 mt-4 md:mt-6">
          <div className="bg-gray-200 dark:bg-slate-800 p-3 rounded-xl text-center flex-1 animate-pulse h-16 min-w-[100px]"></div>
          <div className="bg-gray-200 dark:bg-slate-800 p-3 rounded-xl text-center flex-1 animate-pulse h-16 min-w-[100px]"></div>
          <div className="bg-gray-200 dark:bg-slate-800 p-3 rounded-xl text-center flex-1 animate-pulse h-16 min-w-[100px]"></div>
        </div>
      </div>
    </>
  );
};

const MessageSkeleton = () => {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-200 dark:bg-slate-800 rounded-full"></div>
        <div>
          <div className="h-5 w-32 bg-gray-200 dark:bg-slate-800 rounded-md"></div>
          <div className="h-3 w-24 bg-gray-200 dark:bg-slate-800 rounded-md mt-2"></div>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-4 w-full bg-gray-200 dark:bg-slate-800 rounded-md"></div>
        <div className="h-4 w-5/6 bg-gray-200 dark:bg-slate-800 rounded-md mt-2"></div>
        <div className="h-4 w-4/6 bg-gray-200 dark:bg-slate-800 rounded-md mt-2"></div>

        <div className="mt-4 pt-3 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 sm:gap-0 border-t border-gray-100 dark:border-slate-800">
          <div className="h-6 w-20 bg-gray-200 dark:bg-slate-800 rounded-full"></div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="h-6 w-10 bg-gray-200 dark:bg-slate-800 rounded-md"></div>
            <div className="h-6 w-24 bg-gray-200 dark:bg-slate-800 rounded-full"></div>
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
  const [likes, setLikes] = React.useState<number>(post.likes);

  const toggleSolvedStatus = (): void => {
    setIsSolved((prev) => !prev);
  };

  const formatDate = (date: Date): string => {
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

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden flex-shrink-0">
          <Image
            src={studentData?.profilePictureUrl || "/boy.png"}
            width={50}
            height={50}
            alt="profile"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h3 className="font-medium">{post.author}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(post.timestamp)}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-gray-700 dark:text-gray-300">{post.content}</p>

        <div className="mt-4 pt-3 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 sm:gap-0 border-t border-gray-100 dark:border-slate-800">
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full ${
              post.type === "Maintenance"
                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-500 border border-blue-100 dark:border-blue-500/20"
                : "bg-red-50 dark:bg-red-500/10 text-red-500 border border-red-100 dark:border-red-500/20"
            }`}
          >
            {post.type}
          </span>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              onClick={() => setLikes((prev) => prev + 1)}
              className="flex items-center cursor-pointer gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 10v12" />
                <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
              </svg>
              {likes}
            </button>
            <button
              onClick={toggleSolvedStatus}
              className={`px-3 py-1 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                isSolved
                  ? "bg-green-50 dark:bg-green-500/10 text-green-500 border border-green-100 dark:border-green-500/20"
                  : "bg-gray-50 dark:bg-gray-700/30 text-gray-500 border border-gray-200 dark:border-gray-700"
              }`}
            >
              {isSolved ? "Solved" : "Mark as Solved"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
