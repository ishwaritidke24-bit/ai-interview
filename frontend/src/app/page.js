'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
          credentials: 'include'
        });
        if (res.ok) {
          setIsAuthenticated(true);
        }
      } catch (e) {
        // Not authenticated
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
      <main className="max-w-3xl w-full bg-white p-10 rounded-xl shadow-lg border border-gray-100">
        <h1 className="text-4xl font-extrabold text-blue-700 tracking-tight mb-4">
          AI Interview Prep Kit
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Upload a Job Description and your Company's URL, and we'll generate a personalized,
          day-by-day interview preparation kit complete with study questions and flashcards.
        </p>

        {loading ? (
          <div className="animate-pulse flex space-x-4 justify-center mt-8">
            <div className="h-10 bg-gray-200 rounded w-24"></div>
          </div>
        ) : isAuthenticated ? (
          <div className="flex flex-col items-center gap-4 mt-8">
            <p className="text-gray-700 font-medium">Welcome back!</p>
            <div className="flex gap-4">
              <Link href="/dashboard" className="bg-white text-blue-600 border border-blue-600 font-bold py-3 px-6 rounded hover:bg-blue-50 transition">
                Go to Dashboard
              </Link>
              <Link href="/dashboard/create" className="bg-blue-600 text-white font-bold py-3 px-6 rounded hover:bg-blue-700 transition">
                Create Interview Kit
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 mt-8">
            <div className="flex gap-4">
              <Link href="/login" className="bg-white text-blue-600 border border-blue-600 font-bold py-3 px-8 rounded hover:bg-blue-50 transition">
                Log In
              </Link>
              <Link href="/register" className="bg-blue-600 text-white font-bold py-3 px-8 rounded hover:bg-blue-700 transition">
                Register
              </Link>
            </div>
            <div className="text-sm text-gray-500 flex items-center justify-center gap-2 mt-4">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <p>Authentication is required to create and save your kits.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
