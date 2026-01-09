'use client'; // This tells Next.js this part is interactive

export default function SearchFilter({ onSearch }: { onSearch: (term: string) => void }) {
  return (
    <div className="bg-blue-700 p-8 rounded-2xl shadow-xl mb-12 text-white">
      <h2 className="text-xl font-semibold mb-4 text-center">Which university are you looking for?</h2>
      <div className="flex flex-col md:flex-row gap-4">
        <input 
          type="text" 
          placeholder="Type University Name (e.g. Oxford)..." 
          onChange={(e) => onSearch(e.target.value)}
          className="flex-1 p-4 rounded-lg text-slate-900 outline-none focus:ring-4 focus:ring-blue-300 transition-all"
        />
      </div>
    </div>
  );
}