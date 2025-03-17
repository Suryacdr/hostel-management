"use client";

import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { auth } from "@/lib/firebase";

export default function FloorWarden() {
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
  return (
    <div className="">
      <h2>Floor Warden</h2>
      <button onClick={handleSignOut} className="inline-flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-red-500 transition-colors">
        <LogOut size={18} />
        <span className="text-sm font-medium">Logout</span>
      </button>
    </div>
  );
}
