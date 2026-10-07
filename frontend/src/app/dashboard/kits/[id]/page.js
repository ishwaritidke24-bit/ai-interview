'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function KitWorkspaceContent() {
  const params = useParams();
  const { id } = params;
  const [kit, setKit] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchKit();
  }, [id]);

  const fetchKit = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/kits/${id}`, {
        credentials: 'include'
      });
      if (res.status === 404) throw new Error('We couldn\'t load this kit.');
      if (!res.ok) throw new Error('Failed to fetch kit.');
      const data = await res.json();
      setKit(data.kit);
      setDraft(JSON.parse(JSON.stringify(data.kit))); // Deep clone for draft
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMessage('');
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/kits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_brief: draft.company_brief,
          role: draft.role,
          questions: draft.questions,
          flashcards: draft.flashcards
        }),
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to save changes.');
      const data = await res.json();
      setKit(data.kit);
      setDraft(JSON.parse(JSON.stringify(data.kit)));
      setSaveMessage('Saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = (section, key, value) => {
    setDraft(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value }
    }));
  };

  // Generic Array Helpers
  const updateArrayItem = (arrayName, index, field, value) => {
    const newArray = [...draft[arrayName]];
    newArray[index][field] = value;
    setDraft({ ...draft, [arrayName]: newArray });
  };

  const removeArrayItem = (arrayName, index) => {
    const newArray = [...draft[arrayName]];
    newArray.splice(index, 1);
    setDraft({ ...draft, [arrayName]: newArray });
  };

  const moveArrayItem = (arrayName, index, direction) => {
    const newArray = [...draft[arrayName]];
    if (direction === 'up' && index > 0) {
      [newArray[index - 1], newArray[index]] = [newArray[index], newArray[index - 1]];
    } else if (direction === 'down' && index < newArray.length - 1) {
      [newArray[index + 1], newArray[index]] = [newArray[index], newArray[index + 1]];
    }
    setDraft({ ...draft, [arrayName]: newArray });
  };

  const addQuestion = () => {
    const newQ = { id: `q${Date.now()}`, requirement_ids: [], category: 'technical', prompt: 'New Question', answer_outline: 'Outline here', difficulty: 2 };
    setDraft({ ...draft, questions: [...draft.questions, newQ] });
  };

  const addFlashcard = () => {
    const newF = { id: `f${Date.now()}`, front: 'New Front', back: 'New Back', requirement_ids: [] };
    setDraft({ ...draft, flashcards: [...draft.flashcards, newF] });
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500 text-lg">Loading your interview kit...</p></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Sticky Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-900">
                &larr; Dashboard
              </Link>
              <h1 className="text-xl font-bold text-gray-900 truncate">
                Builder: {draft.role?.title || 'Untitled'} at {draft.source?.company || 'Company'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-green-600 font-medium">{saveMessage}</span>
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link 
                href={`/dashboard/kits/${id}/practice`}
                className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg font-medium hover:bg-emerald-200 transition"
              >
                Practice Flashcards
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto mt-8 px-4 space-y-8">
        
        {/* Company Brief */}
        <section className="bg-white shadow-sm rounded-2xl p-6 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">Company Brief</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
              <textarea 
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                value={draft.company_brief?.summary || ''}
                onChange={e => updateDraft('company_brief', 'summary', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">What they do</label>
              <textarea 
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[120px]"
                value={draft.company_brief?.what_they_do || ''}
                onChange={e => updateDraft('company_brief', 'what_they_do', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Questions */}
        <section className="bg-white shadow-sm rounded-2xl p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-900">Question Bank</h2>
            <button onClick={addQuestion} className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition">
              + Add Question
            </button>
          </div>

          <div className="space-y-6">
            {draft.questions.map((q, idx) => (
              <div key={q.id || idx} className="bg-gray-50 rounded-xl p-5 border border-gray-200 relative group">
                <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => moveArrayItem('questions', idx, 'up')} disabled={idx===0} className="p-1 hover:bg-white rounded disabled:opacity-30">↑</button>
                  <button onClick={() => moveArrayItem('questions', idx, 'down')} disabled={idx===draft.questions.length-1} className="p-1 hover:bg-white rounded disabled:opacity-30">↓</button>
                  <button onClick={() => removeArrayItem('questions', idx)} className="p-1 text-red-500 hover:bg-white rounded">✕</button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4 pr-24">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                    <select 
                      className="w-full p-2 border border-gray-200 rounded bg-white text-sm"
                      value={q.category}
                      onChange={e => updateArrayItem('questions', idx, 'category', e.target.value)}
                    >
                      <option value="technical">Technical</option>
                      <option value="behavioural">Behavioural</option>
                      <option value="system-design">System Design</option>
                      <option value="company-fit">Company Fit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Difficulty (1-3)</label>
                    <select 
                      className="w-full p-2 border border-gray-200 rounded bg-white text-sm"
                      value={q.difficulty}
                      onChange={e => updateArrayItem('questions', idx, 'difficulty', parseInt(e.target.value))}
                    >
                      <option value={1}>1 - Basic</option>
                      <option value={2}>2 - Intermediate</option>
                      <option value={3}>3 - Advanced</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
                    <textarea 
                      className="w-full p-3 border border-gray-200 rounded bg-white focus:ring-2 focus:ring-indigo-500"
                      value={q.prompt}
                      onChange={e => updateArrayItem('questions', idx, 'prompt', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Answer Outline</label>
                    <textarea 
                      className="w-full p-3 border border-gray-200 rounded bg-white focus:ring-2 focus:ring-indigo-500"
                      value={q.answer_outline}
                      onChange={e => updateArrayItem('questions', idx, 'answer_outline', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
            {draft.questions.length === 0 && <p className="text-gray-500 italic text-center">No questions in this kit.</p>}
          </div>
        </section>

        {/* Flashcards */}
        <section className="bg-white shadow-sm rounded-2xl p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-900">Flashcards</h2>
            <button onClick={addFlashcard} className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition">
              + Add Flashcard
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {draft.flashcards.map((f, idx) => (
              <div key={f.id || idx} className="bg-gray-50 rounded-xl p-5 border border-gray-200 flex flex-col sm:flex-row gap-4 relative group">
                <div className="absolute top-2 right-2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => moveArrayItem('flashcards', idx, 'up')} disabled={idx===0} className="p-1 hover:bg-white rounded disabled:opacity-30">↑</button>
                  <button onClick={() => moveArrayItem('flashcards', idx, 'down')} disabled={idx===draft.flashcards.length-1} className="p-1 hover:bg-white rounded disabled:opacity-30">↓</button>
                  <button onClick={() => removeArrayItem('flashcards', idx)} className="p-1 text-red-500 hover:bg-white rounded">✕</button>
                </div>
                
                <div className="flex-1 pr-8">
                  <label className="block text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">Front (Question)</label>
                  <textarea 
                    className="w-full p-2 border border-gray-200 rounded bg-white text-sm focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                    value={f.front}
                    onChange={e => updateArrayItem('flashcards', idx, 'front', e.target.value)}
                  />
                </div>
                <div className="flex-1 pr-8">
                  <label className="block text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Back (Answer)</label>
                  <textarea 
                    className="w-full p-2 border border-gray-200 rounded bg-white text-sm focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                    value={f.back}
                    onChange={e => updateArrayItem('flashcards', idx, 'back', e.target.value)}
                  />
                </div>
              </div>
            ))}
            {draft.flashcards.length === 0 && <p className="text-gray-500 italic text-center">No flashcards in this kit.</p>}
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
