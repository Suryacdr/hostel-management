import Link from "next/link";
import { Home } from "lucide-react";
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 text-center">
      <div className="space-y-6">
        <h1 className="text-6xl font-extrabold text-gray-900 sm:text-8xl">
          404
        </h1>
        <h2 className="text-3xl font-semibold text-gray-700 sm:text-4xl">
          Page Not Found
        </h2>
        <p className="mx-auto max-w-md text-lg text-gray-500">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/" className="inline-flex items-center">
          <Home className="mr-2 h-5 w-5" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
