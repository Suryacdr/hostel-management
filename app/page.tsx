"use client";

import { AtSign, Key, Building2 } from "lucide-react";
import { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // New state for password visibility
  const router = useRouter();
  const auth = getAuth(app);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Get user token to check role
      const idTokenResult = await userCredential.user.getIdTokenResult();
      const userRole = idTokenResult.claims.role;

      // Redirect based on user role
      switch (userRole) {
        case 'student':
          router.push('/dashboard/student');
          break;
        case 'chief_warden':
          router.push('/dashboard/chief-warden');
          break;
        case 'supervisor':
          router.push('/dashboard/supervisor');
          break;
        case 'hostel_warden':
          router.push('/dashboard/hostel-warden');
          break;
        case 'floor_warden':
          router.push('/dashboard/floor-warden');
          break;
        case 'floor_attendant':
          router.push('/dashboard/floor-attendant');
          break;
        default:
          router.push('/dashboard');
          break;
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setError(error.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left Section - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-900 text-white flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8" />
            <span className="text-2xl font-bold">Sikkim Manipal Institute of Technology</span>
          </div>
          <p className="mt-8 text-3xl font-light">
            Welcome to the Hostel Management Portal
          </p>
        </div>
        <div className="text-sm opacity-70">
          © 2024 All rights reserved.
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 lg:px-20 bg-gray-50">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-12">
            <h1 className="text-2xl font-semibold text-gray-900">Sign in to your account</h1>
            <p className="mt-2 text-sm text-gray-600">
              Please enter your credentials to continue
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-6">
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</label>
              <div className="flex p-3 gap-3 items-center border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                <AtSign className="w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  className="flex-1 outline-none bg-transparent text-gray-900 placeholder:text-gray-400 text-sm"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
              <div className="flex p-3 gap-3 items-center border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                <Key className="w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="flex-1 outline-none bg-transparent text-gray-900 placeholder:text-gray-400 text-sm"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-600">Show password</span>
              </label>
              <a href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800">
                Forgot password?
              </a>
            </div>

            <p className="text-xs text-gray-500 border-l-4 border-blue-200 pl-3">
              Note: New students should use their registration number as password
            </p>

            <button 
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
