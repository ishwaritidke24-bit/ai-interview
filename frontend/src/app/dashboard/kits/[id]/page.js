'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function KitWorkspaceContent() {
  const params = useParams();
  const { id } = params;
  const [kit, setKit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchKit = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/kits/${id}`, {
          credentials: 'include'
        });

        if (res.status === 404) {
          throw new Error('We couldn\'t load this kit.');
        }

        if (!res.ok) {
          throw new Error('Failed to fetch kit.');
        }

        const data = await res.json();
        setKit(data.kit);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchKit();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading your interview kit...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{error}</h2>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-500 font-medium">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-900 mr-4">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-gray-900 truncate">
                {kit.role?.title || 'Untitled Role'} at {kit.source?.company || kit.source?.company_url || 'Unknown Company'}
              </h1>
            </div>
            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                {kit.status}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto mt-8 px-4 sm:px-6 lg:px-8 space-y-8">
        <section className="bg-white shadow rounded-lg p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Brief</h2>
          <div className="p-4 bg-gray-50 rounded border border-gray-200 text-gray-500 text-center italic">
            Content will appear here once generation is complete.
          </div>
        </section>

        <section className="bg-white shadow rounded-lg p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Role Breakdown</h2>
          <div className="p-4 bg-gray-50 rounded border border-gray-200 text-gray-500 text-center italic">
            Content will appear here once generation is complete.
          </div>
        </section>

        <section className="bg-white shadow rounded-lg p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Question Bank</h2>
          <div className="p-4 bg-gray-50 rounded border border-gray-200 text-gray-500 text-center italic">
            Content will appear here once generation is complete.
          </div>
        </section>

        <section className="bg-white shadow rounded-lg p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Flashcards</h2>
          <div className="p-4 bg-gray-50 rounded border border-gray-200 text-gray-500 text-center italic">
            Content will appear here once generation is complete.
          </div>
        </section>

        <section className="bg-white shadow rounded-lg p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Study Schedule ({kit.schedule?.days_available} Days)</h2>
          <div className="p-4 bg-gray-50 rounded border border-gray-200 text-gray-500 text-center italic">
            Content will appear here once generation is complete.
          </div>
        </section>
      </main>
    </div>
  );
}

export default function KitWorkspace() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500 text-lg">Loading your interview kit...</p></div>}>
      <KitWorkspaceContent />
    </Suspense>
  );
}
