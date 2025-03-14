"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import Image from "next/image";
import { LogOut, Menu, User } from "lucide-react";
import React from "react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

interface Post {
  id: number;
  content: string;
  tag: "Complaint" | "Maintenance";
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

  // Close menu when clicking outside
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

  const handlePost = () => {
    if (postContent.trim() === "" || selectedTag === "") return;

    const newPost: Post = {
      id: Date.now(),
      content: postContent,
      tag: selectedTag as "Complaint" | "Maintenance",
      timestamp: new Date(),
      author: studentData?.name || "Error",
      likes: 0,
      solved: false,
    };

    setPosts([newPost, ...posts]);
    setPostContent("");
    setSelectedTag("");
  };

  // Fetch student data from the API
  React.useEffect(() => {
    const fetchStudentData = async () => {
      try {
        // Get the current user
        const user = auth.currentUser;
        if (!user) {
          console.log("No user logged in");
          return;
        }

        // Get a fresh token
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

        // Update student data
        setStudentData(data.student);

        // Convert timestamps to Date objects if they're not already
        const formattedPosts = (data.posts || []).map((post: any) => ({
          ...post,
          timestamp:
            post.timestamp instanceof Date
              ? post.timestamp
              : new Date(post.timestamp),
        }));

        setPosts(formattedPosts);
      } catch (error) {
        console.error("Error fetching student data:", error);
      }
    };

    // Check if user is logged in before fetching data
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchStudentData();
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950 dark:text-white">
      <div className="bg-white dark:bg-slate-900 shadow-md rounded-b-3xl mb-6">
        <div className="max-w-6xl mx-auto p-6 flex items-start gap-8">
          <div className="w-40 h-40 rounded-full overflow-hidden ring-4 ring-gray-100 dark:ring-slate-800 flex-shrink-0">
            <Image
              src={"/test.jpeg"}
              width={200}
              height={200}
              alt="Profile"
              className="object-cover w-full h-full"
            />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">
                  {studentData?.name || ""}
                </h2>
                <h3 className="text-lg text-gray-600 dark:text-gray-400">
                  {studentData?.id || ""}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  {studentData?.email || ""}
                </p>
              </div>
              <div className="flex items-center gap-3 relative">
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
                    <button className="inline-flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-700 dark:text-gray-200 transition-colors">
                      <User size={18} />
                      <span className="text-sm font-medium">Edit Profile</span>
                    </button>
                    <button onClick={handleSignOut} className="inline-flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-red-500 transition-colors">
                      <LogOut size={18} />
                      <span className="text-sm font-medium">Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <div className="bg-gray-100 dark:bg-slate-800 p-3 rounded-xl text-center flex-1 shadow-sm">
                <p className="text-xl font-semibold">
                  {studentData?.course || ""}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Course
                </p>
              </div>
              <div className="bg-gray-100 dark:bg-slate-800 p-3 rounded-xl text-center flex-1 shadow-sm">
                <p className="text-xl font-semibold">
                  {studentData?.department || ""}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Dept</p>
              </div>
              <div className="bg-gray-100 dark:bg-slate-800 p-3 rounded-xl text-center flex-1 shadow-sm">
                <p className="text-xl font-semibold">
                  {studentData?.room || ""}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Room</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto px-4 pb-8">
        <div className="w-full">
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm">
              <div className="bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden">
                <input
                  type="text"
                  placeholder="Have any complaints or maintenance?"
                  className="w-full p-3 bg-transparent outline-none"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    className={`border-2 border-red-500 cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                      selectedTag === "Complaint"
                        ? "bg-red-50 dark:bg-red-500/10 text-red-500"
                        : "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                    }`}
                    onClick={() => setSelectedTag("Complaint")}
                  >
                    Complaint
                  </button>
                  <button
                    className={`border-2 border-blue-500 cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
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
                  className={`px-5 py-2 text-sm text-white cursor-pointer rounded-xl transition-colors ${
                    postContent.trim() !== "" && selectedTag !== ""
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-blue-400 cursor-not-allowed"
                  }`}
                  onClick={handlePost}
                  disabled={postContent.trim() === "" || selectedTag === ""}
                >
                  Post
                </button>
              </div>
            </div>
            {posts.length > 0 ? (
              posts.map((post) => <MessageBox key={post.id} post={post} />)
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
    </div>
  );
}

// Props interface for MessageBox
interface MessageBoxProps {
  post: Post;
}

const MessageBox: React.FC<MessageBoxProps> = ({ post }) => {
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
        <Image
          src={"/test.jpeg"}
          width={48}
          height={48}
          alt="profile"
          className="rounded-full"
        />
        <div>
          <h3 className="font-medium">{post.author}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(post.timestamp)}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-gray-700 dark:text-gray-300">{post.content}</p>

        <div className="mt-4 pt-3 flex items-center justify-between border-t border-gray-100 dark:border-slate-800">
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full ${
              post.tag === "Maintenance"
                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-500 border border-blue-100 dark:border-blue-500/20"
                : "bg-red-50 dark:bg-red-500/10 text-red-500 border border-red-100 dark:border-red-500/20"
            }`}
          >
            {post.tag}
          </span>
          <div className="flex items-center gap-3">
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
