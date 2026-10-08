"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PracticeModeClient({ kitId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [practiceState, setPracticeState] = useState(null);

  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    loadPracticeState();
  }, [kitId]);

  const loadPracticeState = async () => {
    try {
      setLoading(true);
      setError(null);
      setRevealed(false);
      setSubmitError(null);

      const res = await fetch(`/api/kits/${kitId}/practice`);
      if (!res.ok) throw new Error('We couldn\'t load this practice session.');
      const data = await res.json();
      setPracticeState(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitConfidence = async (score) => {
    try {
      setSubmitting(true);
      setSubmitError(null);

      const res = await fetch(`/api/kits/${kitId}/practice/${practiceState.nextCard.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confidence: score })
      });

      if (!res.ok) throw new Error('Failed to save result. Please try again.');
      await loadPracticeState();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-gray-500">
        <p className="animate-pulse text-lg">Loading your practice session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 text-center">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl shadow-sm border border-red-100 max-w-md w-full">
          <p className="font-medium mb-4">{error}</p>
          <button onClick={loadPracticeState} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl transition-colors font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (practiceState.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">No flashcards available</h2>
        <p className="text-gray-500 mb-6">No flashcards are available for practice yet.</p>
        <Link href={`/dashboard/kits/${kitId}`} className="bg-indigo-600 text-white px-6 py-2 rounded-full hover:bg-indigo-700 transition font-medium">
          Return to Kit
        </Link>
      </div>
    );
  }

  // Completion State
  if (!practiceState.nextCard || (practiceState.unpracticed === 0 && !practiceState.nextCard)) {
    // No special handling needed
  }

  const { nextCard, total, practiced, unpracticed } = practiceState;
  const isFirstCompletion = unpracticed === 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="w-full max-w-2xl flex justify-between items-end mb-8">
        <div>
          <Link href={`/dashboard/kits/${kitId}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition mb-2 block">
            ← Back to Kit
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Practice Mode</h1>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
            <span className="text-indigo-600 font-bold">{practiced}</span> / {total} practiced
            {unpracticed > 0 && <span className="text-gray-400 ml-2">({unpracticed} remaining)</span>}
          </p>
        </div>
      </div>

      {isFirstCompletion && !revealed && (
        <div className="w-full max-w-2xl bg-green-50 text-green-800 p-4 rounded-xl mb-6 shadow-sm border border-green-200 text-center font-medium">
          You've practiced all {total} flashcards! Continuing will review your weakest areas.
        </div>
      )}

      <div className="w-full max-w-2xl perspective-1000">
        <div className={`bg-white rounded-3xl shadow-xl border border-gray-100 p-10 min-h-[300px] flex flex-col justify-center transition-all duration-300 ease-in-out ${revealed ? 'shadow-2xl ring-4 ring-indigo-50 border-indigo-100' : 'hover:shadow-2xl cursor-pointer'}`}
          onClick={!revealed ? () => setRevealed(true) : undefined}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (!revealed && (e.key === 'Enter' || e.key === ' ')) setRevealed(true); }}
        >
          <h3 className="text-sm uppercase tracking-widest text-indigo-500 font-semibold mb-6 text-center">
            {revealed ? 'Front / Back' : 'Question'}
          </h3>
          <div className="text-2xl sm:text-3xl font-medium text-gray-900 text-center leading-relaxed mb-8">
            {nextCard.front}
          </div>
          {revealed ? (
            <div className="mt-4 pt-8 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-lg sm:text-xl text-gray-600 text-center leading-relaxed">{nextCard.back}</div>
            </div>
          ) : (
            <div className="text-center mt-auto">
              <button onClick={(e) => { e.stopPropagation(); setRevealed(true); }} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-8 py-3 rounded-full font-medium transition">
                Reveal Answer
              </button>
            </div>
          )}
        </div>
      </div>

      {revealed && (
        <div className="w-full max-w-2xl mt-8 animate-in fade-in slide-from-bottom-8 duration-500">
          <p className="text-center text-sm font-medium text-gray-500 uppercase tracking-widest mb-4">How well did you know this?</p>
          {submitError && (
            <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm text-center font-medium mb-4">{submitError}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {[ 
              { score: 1, label: 'Not confident', color: 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200' },
              { score: 2, label: 'Weak', color: 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200' },
              { score: 3, label: 'Okay', color: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200' },
              { score: 4, label: 'Confident', color: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200' },
              { score: 5, label: 'Very confident', color: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200' }
            ].map(btn => (
              <button key={btn.score} disabled={submitting} onClick={() => submitConfidence(btn.score)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-200 ${btn.color} ${submitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95 shadow-sm hover:shadow'}`}
              >
                <span className="text-2xl font-bold mb-1">{btn.score}</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-center">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
