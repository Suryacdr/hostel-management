"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { ReactNode } from 'react';

interface AuthGuardProps {
  children: ReactNode;
  publicRoutes?: string[];
}

export default function AuthGuard({ 
  children, 
  publicRoutes = ['/notice-board']
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      // Check if current path is a public route
      const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));
      
      if (!user && !isPublicRoute) {
        console.log('User not authenticated, redirecting to login page');
        router.push('/');
      } else {
        setIsAuthorized(true);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router, pathname, publicRoutes]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return isAuthorized ? <>{children}</> : null;
}
