'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('events')
        .select(`*, universities (name, logo_url)`)
        .gte('event_date', today)
        .order('event_date', { ascending: true });

      if (!error) {
        setAllEvents(data || []);
        setFilteredEvents(data || []);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSearchTerm('');
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    const results = allEvents.filter(event =>
      event.universities?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.city.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEvents(results);
  }, [searchTerm, allEvents]);

  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-20">
      <header className="bg-white border-b border-slate-200 py-10 px-6 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">University Event Finder</h1>
        <p className="text-slate-600 max-w-xl mx-auto text-sm md:text-base">Find where your future university is heading next.</p>
      </header>

      <section className="max-w-5xl mx-auto p-6 md:p-12">
        {/* Search Bar */}
        <div className="bg-[#1e3a8a] p-8 md:p-12 rounded-[2rem] shadow-2xl mb-12 text-white relative overflow-hidden border border-blue-400/20">
          <div className="relative z-10 w-full">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><span>🔍</span> Find Your Event</h2>
            <div className="relative w-full mt-6">
              <input 
                type="text" 
                placeholder="Search University or City..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-5 pr-32 rounded-2xl text-slate-900 outline-none border-4 border-transparent focus:border-blue-400/50 transition-all text-lg shadow-2xl bg-white placeholder:text-slate-400"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-2 text-xs font-bold bg-slate-100 text-slate-600 rounded-xl">Clear</button>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-20 text-slate-400">Loading...</div>
          ) : filteredEvents.map((event) => (
            <div key={event.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col md:flex-row">
              <div className="p-6 md:p-8 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-blue-600 font-bold text-xs uppercase tracking-widest mb-1">{event.universities?.name}</p>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">{event.event_name}</h2>
                  </div>
                  <span className="bg-green-50 text-green-700 text-[10px] font-black px-2 py-1 rounded border border-green-200 uppercase">Upcoming</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-600 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">📍</span> 
                    <div>
                      <p className="font-bold">{event.city}</p>
                      <p className="text-xs text-slate-400">{event.venue}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📅</span> <span>{new Date(event.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} • {event.event_time}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <span className="text-lg">🎓</span> 
                    <div className="flex flex-wrap gap-1">
                      {event.study_levels?.map((l: string) => (
                        <span key={l} className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded uppercase font-bold">{l}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Panel */}
              <div className="bg-slate-50 p-6 md:p-8 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-slate-100 min-w-[220px]">
                <p className="text-[10px] text-slate-400 mb-4 uppercase font-bold text-center tracking-widest">Org: {event.organizer}</p>
                <a href={event.cta_url} target="_blank" className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 px-8 rounded-xl transition-all w-full text-center text-sm shadow-lg shadow-blue-100">Register Now</a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}