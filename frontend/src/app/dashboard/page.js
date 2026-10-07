'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [kits, setKits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kitsLoading, setKitsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error('Unauthenticated');
        }

        const data = await res.json();
        setUser(data.user);
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (user) {
      const fetchKits = async () => {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/kits`, {
            credentials: 'include'
          });
          if (res.ok) {
            const data = await res.json();
            setKits(data.kits);
          }
        } catch (error) {
          console.error('Failed to fetch kits', error);
        } finally {
          setKitsLoading(false);
        }
      };
      fetchKits();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading your dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">AI Interview Prep Kit</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">{user.email}</span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Interview Kits</h2>
          <Link
            href="/dashboard/create"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Create New Kit
          </Link>
        </div>

        {kitsLoading ? (
          <div className="bg-white shadow rounded-lg p-6 border border-gray-100 text-center text-gray-500">
            Loading your interview kits...
          </div>
        ) : kits.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-10 border border-gray-100 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900">No interview kits yet.</h3>
            <p className="mt-1 text-sm text-gray-500 mb-6">
              Get started by uploading a job description to generate your first prep kit.
            </p>
            <Link
              href="/dashboard/create"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Create New Kit
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {kits.map((kit) => (
                <li key={kit.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {kit.role || 'Untitled Role'} at {kit.company || kit.company_url || 'Unknown Company'}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Created {new Date(kit.createdAt).toLocaleDateString()} • {kit.days_available} days schedule • Status: <span className="font-medium capitalize">{kit.status}</span>
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/kits/${kit.id}`}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Open
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
