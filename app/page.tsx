'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  // --- 1. STATE MANAGEMENT ---
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 10;

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selCity, setSelCity] = useState('');
  const [selCountry, setSelCountry] = useState('');
  const [selLevel, setSelLevel] = useState('');

  // --- 2. DATA FETCHING ---
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        universities (name, logo_url, country)
      `)
      .gte('event_date', today)
      .order('event_date', { ascending: true });

    if (!error) {
      setAllEvents(data || []);
      setFilteredEvents(data || []);
    }
    setLoading(false);
  }

  // --- 3. ANALYTICS & REDIRECT ---
  const trackAndRedirect = async (eventId: string, url: string) => {
    try {
      await supabase.from('analytics').insert([{ event_id: eventId }]);
    } catch (err) {
      console.error("Tracking failed");
    }
    window.open(url, '_blank');
  };

  // --- 4. MULTI-FILTER ENGINE ---
  useEffect(() => {
    let results = allEvents;

    if (searchTerm) {
      results = results.filter(e => 
        e.universities?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.event_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (selCity) {
      results = results.filter(e => e.city === selCity);
    }
    if (selCountry) {
      results = results.filter(e => e.universities?.country === selCountry);
    }
    if (selLevel) {
      results = results.filter(e => e.study_levels?.includes(selLevel));
    }
    
    setFilteredEvents(results);
    setCurrentPage(1); 
  }, [searchTerm, selCity, selCountry, selLevel, allEvents]);

  // --- 5. FILTER TAG HELPERS ---
  const clearAllFilters = () => {
    setSearchTerm('');
    setSelCity('');
    setSelCountry('');
    setSelLevel('');
  };

  const activeFilters = useMemo(() => {
    const tags = [];
    if (searchTerm) tags.push({ id: 'search', label: `Search: ${searchTerm}`, clear: () => setSearchTerm('') });
    if (selCity) tags.push({ id: 'city', label: `City: ${selCity}`, clear: () => setSelCity('') });
    if (selCountry) tags.push({ id: 'country', label: `Country: ${selCountry}`, clear: () => setSelCountry('') });
    if (selLevel) tags.push({ id: 'level', label: `Level: ${selLevel}`, clear: () => setSelLevel('') });
    return tags;
  }, [searchTerm, selCity, selCountry, selLevel]);

  // --- 6. PAGINATION MATH ---
  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = filteredEvents.slice(indexOfFirstEvent, indexOfLastEvent);
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);

  const cities = Array.from(new Set(allEvents.map(e => e.city))).sort();
  const countries = Array.from(new Set(allEvents.map(e => e.universities?.country))).filter(Boolean).sort();
  const levelsOptions = ['Bachelors', 'Masters', 'MBA', 'PhD', 'Diploma'];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* --- TOP NAVIGATION BAR --- */}
      <nav className="bg-white border-b border-slate-100 py-4 px-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-black tracking-tighter cursor-pointer" onClick={() => window.location.reload()}>
            <span className="text-blue-600">Uni</span>
            <span className="text-slate-500">Tour</span>
            <span className="text-orange-600">Maps</span>
          </div>
          
          <div className="hidden md:flex gap-8 font-bold text-sm">
            <button className="text-blue-600 border-b-2 border-blue-600 pb-1">Home</button>
            <button className="text-slate-400 hover:text-slate-600">About</button>
            <button className="text-slate-400 hover:text-slate-600">Blog</button>
            <button className="text-slate-400 hover:text-slate-600">Contact</button>
          </div>
        </div>
      </nav>

      {/* --- COMPACT HERO SECTION --- */}
      <header className="bg-blue-600 pt-8 pb-16 px-6 text-center text-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tight">University Events 2026</h1>
          <p className="text-blue-100 font-bold mb-6 text-sm md:text-base opacity-90">Find your path to global education.</p>
          
          <div className="bg-white p-4 md:p-5 rounded-[2.5rem] shadow-2xl flex flex-col gap-4 text-left relative z-10">
            <div className="flex flex-wrap md:flex-nowrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">University Name</label>
                <input 
                  type="text" placeholder="Search..." 
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-900 outline-none focus:ring-2 ring-blue-50 transition-all"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="w-full md:w-60">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Event City</label>
                <select 
                  className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 appearance-none outline-none cursor-pointer" 
                  value={selCity} onChange={(e) => setSelCity(e.target.value)}
                >
                  <option value="">All Cities</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex items-end">
                <button 
                  onClick={() => setShowMoreFilters(!showMoreFilters)}
                  className="p-4 h-[58px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-xs transition-all whitespace-nowrap"
                >
                  {showMoreFilters ? 'Hide' : 'More Filters'}
                </button>
              </div>
            </div>

            {showMoreFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 animate-in fade-in">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Destination Country</label>
                  <select 
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 outline-none cursor-pointer" 
                    value={selCountry} onChange={(e) => setSelCountry(e.target.value)}
                  >
                    <option value="">All Countries</option>
                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Study Level</label>
                  <select 
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-900 outline-none cursor-pointer" 
                    value={selLevel} onChange={(e) => setSelLevel(e.target.value)}
                  >
                    <option value="">All Levels</option>
                    {levelsOptions.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* --- FILTER TAGS & COUNTER --- */}
      <section className="max-w-6xl mx-auto px-6 pt-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="text-sm font-black text-slate-400 uppercase tracking-widest">
            <span className="text-blue-600 text-xl mr-1">{filteredEvents.length}</span> 
            {selLevel ? `${selLevel} Events` : 'Total Events'} Found
          </div>
          
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {activeFilters.map(tag => (
                <div key={tag.id} className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full border border-blue-100 text-[11px] font-black">
                  {tag.label}
                  <button onClick={tag.clear} className="hover:text-blue-800 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              ))}
              <button 
                onClick={clearAllFilters}
                className="text-[10px] font-black text-orange-600 uppercase tracking-tighter hover:underline ml-2"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      </section>

      {/* --- EVENT LISTINGS --- */}
      <section className="max-w-6xl mx-auto p-6 relative z-20">
        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            <div className="text-center py-20 font-black text-slate-300 animate-pulse tracking-widest uppercase">Fetching Events...</div>
          ) : currentEvents.length > 0 ? (
            currentEvents.map((event) => (
              <div key={event.id} className="bg-white border border-slate-100 rounded-[3rem] p-6 md:p-8 shadow-sm hover:shadow-xl transition-all flex flex-col md:row-span-1 md:flex-row gap-8 items-center group">
                
                {/* University Logo */}
                <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-50 rounded-[2rem] flex items-center justify-center p-6 shrink-0 border border-slate-50">
                  {event.universities?.logo_url ? (
                    <img src={event.universities.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="text-3xl font-black text-slate-200">{event.universities?.name?.charAt(0)}</div>
                  )}
                </div>

                {/* Event Content */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-3">
                    <span className="bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">{event.universities?.name}</span>
                    <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">{event.universities?.country}</span>
                    <span className="bg-orange-50 text-orange-600 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider italic font-bold">By {event.organizer}</span>
                  </div>
                  
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-3 group-hover:text-blue-600 transition-colors tracking-tight leading-tight">
                    {event.event_name}
                  </h2>

                  {/* STUDY LEVEL LABELS */}
                  <div className="flex flex-wrap justify-center md:justify-start gap-1 mb-5">
                    {event.study_levels?.map((level: string) => (
                      <span key={level} className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                        {level}
                      </span>
                    ))}
                  </div>
                  
                  {/* Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-bold text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg">📍</span>
                      <span>{event.city}, {event.venue} <br/> <span className="text-slate-400 font-medium italic">({event.event_country})</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg">📅</span>
                      <span>{new Date(event.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} <br/> <span className="text-slate-400 font-medium italic">{event.event_time}</span></span>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="shrink-0 w-full md:w-auto">
                  <button 
                    onClick={() => trackAndRedirect(event.id, event.cta_url)}
                    className="w-full md:w-auto bg-slate-900 hover:bg-blue-600 text-white font-black py-5 px-12 rounded-3xl transition-all shadow-lg active:scale-95"
                  >
                    Register Now
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white p-20 rounded-[3.5rem] text-center border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-bold">No upcoming events found matching your current filters.</p>
            </div>
          )}
        </div>

        {/* --- PAGINATION --- */}
        {!loading && totalPages > 1 && (
          <div className="mt-16 flex justify-center items-center gap-3">
            <button 
              disabled={currentPage === 1}
              onClick={() => {setCurrentPage(currentPage - 1); window.scrollTo({top: 0, behavior: 'smooth'});}}
              className="px-6 py-4 bg-white rounded-2xl font-black text-slate-400 disabled:opacity-20 border border-slate-100 hover:bg-slate-50 transition-all"
            >
              ←
            </button>
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <button 
                  key={i} onClick={() => {setCurrentPage(i + 1); window.scrollTo({top: 0, behavior: 'smooth'});}}
                  className={`w-12 h-12 rounded-2xl font-black transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => {setCurrentPage(currentPage + 1); window.scrollTo({top: 0, behavior: 'smooth'});}}
              className="px-6 py-4 bg-white rounded-2xl font-black text-slate-400 disabled:opacity-20 border border-slate-100 hover:bg-slate-50 transition-all"
            >
              →
            </button>
          </div>
        )}
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-white border-t border-slate-100 pt-20 pb-12 px-6 mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-20">
            <div className="md:col-span-4 space-y-6">
              <div className="text-2xl font-black tracking-tighter">
                <span className="text-blue-600">Uni</span>
                <span className="text-slate-500">Tour</span>
                <span className="text-orange-600">Maps</span>
              </div>
              <p className="text-slate-400 text-base font-medium leading-relaxed max-w-sm">The world's premier directory for verified university tours and international education events.</p>
            </div>
            
            <div className="md:col-span-2">
              <h4 className="font-black text-slate-900 mb-8 uppercase tracking-widest text-[10px]">Explore</h4>
              <div className="flex flex-col gap-5 font-bold text-sm text-slate-400">
                <button className="text-left text-blue-600">Home</button>
                <button className="text-left hover:text-slate-600">About</button>
                <button className="text-left hover:text-slate-600">Blog</button>
                <button className="text-left hover:text-slate-600">Contact</button>
              </div>
            </div>

            <div className="md:col-span-3">
              <h4 className="font-black text-slate-900 mb-8 uppercase tracking-widest text-[10px]">Legal</h4>
              <div className="flex flex-col gap-5 text-sm font-bold text-slate-400">
                <button className="text-left hover:text-slate-600">Terms and Conditions</button>
                <button className="text-left hover:text-slate-600">Privacy Policy</button>
              </div>
            </div>

            <div className="md:col-span-3">
              <h4 className="font-black text-slate-900 mb-8 uppercase tracking-widest text-[10px]">Social Media</h4>
              <div className="flex gap-4">
                {['LinkedIn', 'Twitter', 'Facebook'].map(s => (
                  <div key={s} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-400 hover:bg-blue-600 hover:text-white transition-all cursor-pointer text-xs uppercase">
                    {s.charAt(0)}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="pt-12 border-t border-slate-50 text-center text-slate-400 text-[11px] font-black uppercase tracking-[0.3em]">
            copyright @ 2026 UniTourMaps
          </div>
        </div>
      </footer>
    </div>
  );
}