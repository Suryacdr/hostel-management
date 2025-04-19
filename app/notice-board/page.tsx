"use client";

import React, { useEffect, useState } from 'react';
import { ThemeToggle } from "@/components/ThemeToggle";
import Image from "next/image";
import { Clock, Filter, Home, Search, Settings, Tag, CheckCircle, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/firebase";
import Link from 'next/link';

interface MaintenanceIssue {
  id: string;
  studentId: string;
  studentName: string;
  message: string;
  timestamp: Date;
  type: string;
  solved: boolean;
  hostel?: string;
  room?: string;
  floor?: string;
}

const NoticeBoardSkeleton = () => {
  return (
    <div className="space-y-6">
      {[...Array(5)].map((_, index) => (
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
            <div className="h-4 w-4/6 bg-gray-200 dark:bg-slate-700 rounded-md mt-2"></div>

            <div className="mt-5 pt-4 flex justify-between items-center border-t border-gray-100 dark:border-slate-700">
              <div className="h-6 w-24 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
              <div className="h-6 w-28 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const NoMaintenanceIssues = () => {
  return (
    <motion.div
      className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <div className="flex flex-col items-center justify-center">
        <div className="w-20 h-20 mb-4 text-gray-300 dark:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-2">
          No maintenance issues found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          There are currently no pending maintenance requests
        </p>
      </div>
    </motion.div>
  );
};

export default function NoticeBoard() {
  const [issues, setIssues] = useState<MaintenanceIssue[]>([]);
  const [filteredIssues, setFilteredIssues] = useState<MaintenanceIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'solved'>('all');
  const [error, setError] = useState<string | null>(null);

  // Format date for display
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

  // Fetch maintenance issues
  const fetchMaintenanceIssues = async () => {
    try {
      setIsLoading(true);
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not logged in");
      }

      const token = await user.getIdToken(true);
      
      // Use the new dedicated API endpoint with optional status filter
      let url = '/api/issue/all-issues';
      if (filterStatus !== 'all') {
        url += `?status=${filterStatus}&type=maintenance`;
      } else {
        url += '?type=maintenance'; // Only fetch maintenance issues
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to fetch maintenance issues";
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          errorMessage = errorText || response.statusText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const responseText = await response.text();
      if (!responseText.trim()) {
        console.log("Empty response received from server");
        setIssues([]);
        setFilteredIssues([]);
        return;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError);
        throw new Error("Invalid data format received from server");
      }
      
      // Use the maintenanceIssues property from the new API response
      const allIssues = data.maintenanceIssues || [];

      const formattedIssues = allIssues.map((issue: any) => ({
        id: issue.id || issue.timestamp || `issue-${Date.now()}`,
        studentId: issue.studentId,
        studentName: issue.studentName,
        message: issue.message,
        timestamp: new Date(issue.timestamp || Date.now()),
        type: issue.type,
        solved: issue.solved ?? issue.isSolved ?? false,
        hostel: issue.hostel || "",
        room: issue.studentRoom || "",
        floor: issue.floor || ""
      }));

      setIssues(formattedIssues);
      setFilteredIssues(formattedIssues);
    } catch (err) {
      console.error("Error fetching maintenance issues:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters when search term changes
  useEffect(() => {
    if (issues.length > 0) {
      let filtered = [...issues];
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(issue => 
          issue.message.toLowerCase().includes(term) || 
          issue.studentName.toLowerCase().includes(term) ||
          issue.room?.toLowerCase().includes(term) ||
          issue.hostel?.toLowerCase().includes(term)
        );
      }
      
      setFilteredIssues(filtered);
    }
  }, [searchTerm, issues]);

  // Fetch issues when filter status changes or on component mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchMaintenanceIssues();
      } else {
        setIsLoading(false);
        setError("Please login to view maintenance issues");
      }
    });

    return () => unsubscribe();
  }, [filterStatus]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <Link href="/" className="inline-block bg-indigo-600 text-white px-5 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 dark:text-white">
      <div className="bg-white dark:bg-slate-800 shadow-md mb-6">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <Link href="/" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Maintenance Notice Board</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">View and track all maintenance requests</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student, location, or issue..."
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'all' 
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                <Filter className="h-4 w-4" />
                All
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === 'pending' 
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' 
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                <Tag className="h-4 w-4" />
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
                <CheckCircle className="h-4 w-4" />
                Solved
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {isLoading ? (
          <NoticeBoardSkeleton />
        ) : filteredIssues.length === 0 ? (
          <NoMaintenanceIssues />
        ) : (
          <div className="space-y-6">
            {filteredIssues.map((issue, index) => (
              <motion.div
                key={issue.id}
                className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * (index % 10) }}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 
                    ${issue.solved 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}
                  >
                    <Settings className="w-6 h-6" />
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
                            <Home size={12} className="mr-1" />
                            Hostel: {issue.hostel}
                          </div>
                        )}
                        {issue.room && (
                          <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
                            Room: {issue.room}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {issue.id ? String(issue.id).substring(0, 8) + '...' : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}