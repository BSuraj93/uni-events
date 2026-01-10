'use client';

/**
 * PHASE 2 - USER FACING WEBSITE
 * Features: Multi-Filtering, Uni Logos, Organizer Badges, & Analytics
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  // --- 1. STATE MANAGEMENT ---
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
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
    
    // Fetching events joined with university details (logo, name, country)
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        universities (
          name,
          logo_url,
          country
        )
      `)
      .gte('event_date', today)
      .order('event_date', { ascending: true });

    if (!error) {
      setAllEvents(data || []);
      setFilteredEvents(data || []);
    } else {
      console.error("Supabase Fetch Error:", error.message);
    }
    setLoading(false);
  }

  // --- 3. ANALYTICS TRACKING ---
  const trackAndRedirect = async (eventId: string, url: string) => {
    // Record the click in the analytics table before opening the external link
    try {
      await supabase.from('analytics').insert([
        { event_id: eventId }
      ]);
    } catch (err) {
      console.error("Analytics Log Failed:", err);
    }
    // Proceed to the registration page
    window.open(url, '_blank');
  };

  // --- 4. MULTI-FILTER ENGINE ---
  useEffect(() => {
    let results = allEvents;

    // Search by Event Name or University Name
    if (searchTerm) {
      results = results.filter(e => 
        e.universities?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.event_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by City
    if (selCity) {
      results = results.filter(e => e.city === selCity);
    }

    // Filter by Country (Nested from University table)
    if (selCountry) {
      results = results.filter(e => e.universities?.country === selCountry);
    }

    // Filter by Study Level (Array check)
    if (selLevel) {
      results = results.filter(e => e.study_levels?.includes(selLevel));
    }

    setFilteredEvents(results);
  }, [searchTerm, selCity, selCountry, selLevel, allEvents]);

  // Generate dynamic unique values for the filter dropdowns
  const cities = Array.from(new Set(allEvents.map(e => e.city))).sort();
  const countries = Array.from(new Set(allEvents.map(e => e.universities?.country))).filter(Boolean).sort();
  const levels = ['Bachelors', 'Masters', 'MBA', 'PhD', 'Diploma'];

  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-24 text-slate-900">
      
      {/* HEADER SECTION - Fixed Overlap */}
      <header className="bg-white border-b border-slate-200 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-black mb-4 tracking-tighter">
            Global Study Events
          </h1>
          <p className="text-slate-500 font-semibold text-xl">
            Find and register for upcoming university open days and education fairs.
          </p>
        </div>
      </header>

      <section className="max-w-6xl mx-auto p-6 lg:-mt-12">
        
        {/* FILTER BAR - Advanced UI */}
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-slate-200/60 mb-12 border border-slate-100 flex flex-wrap gap-6 items-end relative z-20">
          
          {/* Keyword Search */}
          <div className="flex-1 min-w-[280px]">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-3">
              Keyword Search
            </label>
            <input 
              type="text" 
              placeholder="Enter University or Event..." 
              className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all font-bold outline-none"
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Country Select */}
          <div className="w-full md:w-48">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-3">
              Country
            </label>
            <select 
              className="w-full p-4 bg-slate-50 rounded-2xl font-bold appearance-none outline-none cursor-pointer border-2 border-transparent focus:border-blue-500" 
              value={selCountry} 
              onChange={(e) => setSelCountry(e.target.value)}
            >
              <option value="">All Countries</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* City Select */}
          <div className="w-full md:w-48">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-3">
              City
            </label>
            <select 
              className="w-full p-4 bg-slate-50 rounded-2xl font-bold appearance-none outline-none cursor-pointer border-2 border-transparent focus:border-blue-500" 
              value={selCity} 
              onChange={(e) => setSelCity(e.target.value)}
            >
              <option value="">All Cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Level Select */}
          <div className="w-full md:w-48">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-3">
              Level
            </label>
            <select 
              className="w-full p-4 bg-slate-50 rounded-2xl font-bold appearance-none outline-none cursor-pointer border-2 border-transparent focus:border-blue-500" 
              value={selLevel} 
              onChange={(e) => setSelLevel(e.target.value)}
            >
              <option value="">All Levels</option>
              {levels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Reset Button */}
          <button 
            onClick={() => {setSearchTerm(''); setSelCity(''); setSelCountry(''); setSelLevel('');}} 
            className="p-4 text-blue-600 font-black text-xs uppercase tracking-widest hover:bg-blue-50 rounded-2xl transition-all"
          >
            Reset
          </button>
        </div>

        {/* RESULTS FEED */}
        <div className="space-y-8">
          {loading ? (
            <div className="text-center py-32">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
              <p className="font-black text-slate-300 uppercase tracking-widest">Updating Events Feed...</p>
            </div>
          ) : filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <div 
                key={event.id} 
                className="bg-white border border-slate-200 rounded-[3.5rem] p-8 md:p-12 shadow-sm hover:shadow-2xl hover:border-blue-200 transition-all flex flex-col md:flex-row gap-12 items-center group"
              >
                
                {/* 1. UNIVERSITY LOGO BOX */}
                <div className="w-32 h-32 md:w-44 md:h-44 bg-slate-50 rounded-[2.5rem] flex items-center justify-center p-8 border border-slate-100 shrink-0 group-hover:scale-105 transition-transform duration-500 shadow-inner">
                  {event.universities?.logo_url ? (
                    <img 
                      src={event.universities.logo_url} 
                      alt="University Logo" 
                      className="max-w-full max-h-full object-contain" 
                    />
                  ) : (
                    <div className="bg-blue-600 w-full h-full rounded-3xl flex items-center justify-center text-white text-5xl font-black shadow-lg">
                      {event.universities?.name?.charAt(0)}
                    </div>
                  )}
                </div>

                {/* 2. EVENT INFORMATION */}
                <div className="flex-1 text-center md:text-left">
                  {/* Branding Badges */}
                  <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-6">
                    <span className="bg-blue-600 text-white text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-[0.15em] shadow-lg shadow-blue-100">
                      {event.universities?.name}
                    </span>
                    <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-[0.15em]">
                      {event.universities?.country}
                    </span>
                    <span className="bg-orange-50 text-orange-600 text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-[0.15em] border border-orange-100 italic">
                      Hosted by {event.organizer}
                    </span>
                  </div>
                  
                  {/* Title */}
                  <h2 className="text-4xl font-black text-slate-900 mb-8 leading-[1.1] group-hover:text-blue-700 transition-colors">
                    {event.event_name}
                  </h2>
                  
                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-12 text-sm font-bold text-slate-600">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl shadow-sm">📍</div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Venue Location</p>
                        <p className="text-slate-900 text-base">{event.city} • {event.venue}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl shadow-sm">🗓️</div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Date & Time</p>
                        <p className="text-slate-900 text-base">
                          {new Date(event.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} 
                          <br /> 
                          {event.event_time}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. CALL TO ACTION */}
                <div className="shrink-0 w-full md:w-auto">
                  <button 
                    onClick={() => trackAndRedirect(event.id, event.cta_url)}
                    className="w-full md:w-auto bg-slate-900 hover:bg-blue-700 text-white font-black py-6 px-14 rounded-[2.5rem] transition-all shadow-2xl shadow-slate-200 active:scale-95 text-lg"
                  >
                    Register Now
                  </button>
                </div>

              </div>
            ))
          ) : (
            <div className="text-center py-32 bg-white rounded-[4rem] border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-black text-xl">No events match your criteria.</p>
              <button onClick={() => {setSearchTerm(''); setSelCity(''); setSelCountry(''); setSelLevel('');}} className="mt-4 text-blue-600 font-bold underline">Show all events</button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}