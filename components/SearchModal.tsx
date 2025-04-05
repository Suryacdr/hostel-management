"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    supervisors?: any[];
    hostel_wardens?: any[];
    floor_wardens?: any[];
    floor_attendants?: any[];
    issues?: any[];
    students?: any[];
  };
}

type FilterType = "all" | "supervisors" | "hostel_wardens" | "floor_wardens" | "floor_attendants" | "issues" | "students";

export default function SearchModal({ isOpen, onClose, data }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!searchQuery) {
        setSearchResults([]);
        setError(null);
        return;
      }

      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setError('Please sign in to use the search feature');
          setSearchResults([]);
          return;
        }

        const response = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}&filter=${activeFilter}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Search failed');
        }

        const data = await response.json();
        setSearchResults(data.results || []);
        setError(null);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        setError(error instanceof Error ? error.message : 'An error occurred while searching');
      }
    };

    const debounceTimer = setTimeout(fetchSearchResults, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, activeFilter]);

  if (!isOpen) return null;

  const filters: { label: string; value: FilterType }[] = [
    { label: "All", value: "all" },
    { label: "Students", value: "students" },
    { label: "Supervisors", value: "supervisors" },
    { label: "Hostel Wardens", value: "hostel_wardens" },
    { label: "Floor Wardens", value: "floor_wardens" },
    { label: "Floor Attendants", value: "floor_attendants" },
    { label: "Issues", value: "issues" },
  ];

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-start justify-center pt-[10vh]">
      <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-lg shadow-lg">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <div className="flex gap-2">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                className={`px-3 py-1 rounded-full text-sm ${activeFilter === filter.value
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {error && (
            <div className="text-center text-red-500 dark:text-red-400 py-4 px-6 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4">
              {error}
            </div>
          )}
          {searchResults.length === 0 && searchQuery && !error && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              No results found
            </div>
          )}
          {searchResults.map((result, index) => (
            <div
              key={index}
              className="p-4 border-b last:border-b-0 border-gray-200 dark:border-gray-700"
            >
              {result.type === "Issue" ? (
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {result.studentName}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${result.solved
                        ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300"
                        : "bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300"
                        }`}
                    >
                      {result.solved ? "Resolved" : "Pending"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {result.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Type: {result.type}
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {result.fullName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {result.type}
                  </p>
                  {result.assignedHostel && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Hostel: {result.assignedHostel}
                    </p>
                  )}
                  {result.assignedFloors && result.assignedFloors.length > 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Floors: {result.assignedFloors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}