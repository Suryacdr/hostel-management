"use client";

import { AtSign, Key } from "lucide-react";
import { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { app } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
    <div className="min-h-screen w-full flex flex-col justify-center items-center">
      <p className="text-center text-gray-600 text-sm mb-6 w-1/6">
        Enter your credentials to access your account.
      </p>
      {error && (
        <p className="text-red-500 text-sm mb-4 max-w-md text-center">{error}</p>
      )}
      <form onSubmit={handleSignIn} className="relative flex flex-col w-1/2 items-center">
        <div className="flex w-1/2 p-2 gap-2 items-center border-2 rounded-xl">
          <AtSign className="w-6 h-6 text-gray-500" />
          <input
            type="email"
            className="outline-none bg-transparent w-full"
            placeholder="College email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex w-1/2 p-2 gap-2 items-center border-2 rounded-xl mt-2">
          <Key className="w-6 h-6 text-gray-500" />
          <input
            type="password"
            className="outline-none bg-transparent w-full"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <p className="text-xs p-0.5 w-1/2">
          For new student password is their registration number
        </p>
        <button 
          type="submit"
          disabled={loading}
          className={`bg-black hover:bg-black/80 text-white cursor-pointer rounded-lg px-4 py-2 mt-2 w-1/2 flex justify-center items-center ${loading ? 'opacity-70' : ''}`}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            "Sign In"
          )}
        </button>
      </form>
    </div>
  );
}
