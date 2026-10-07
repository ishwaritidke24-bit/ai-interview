export default function Home() {
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

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
          <h2 className="text-xl font-semibold text-blue-900 mb-2">Create Your Kit</h2>
          <p className="text-sm text-blue-800 mb-4">
            (Form placeholder)
          </p>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Company URL" 
              className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 opacity-60 cursor-not-allowed" 
              disabled 
            />
            <textarea 
              placeholder="Paste Job Description..." 
              className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 opacity-60 cursor-not-allowed h-32" 
              disabled
            ></textarea>
            <button 
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded hover:bg-blue-700 transition opacity-50 cursor-not-allowed"
              disabled
            >
              Generate Kit (Coming Soon)
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-500 flex items-center justify-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          <p>Authentication will be required to create and save your kits.</p>
        </div>
      </main>
    </div>
  );
}
