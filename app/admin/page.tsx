'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';

export default function AdminPage() {
  const router = useRouter();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'events' | 'manage' | 'stats'>('events');
  
  // Data States
  const [universities, setUniversities] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // CRUD Tracking States
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingUniId, setEditingUniId] = useState<string | null>(null);

  // University Form State
  const [newUni, setNewUni] = useState({ 
    name: '', 
    country: '', 
    logo_url: '' 
  });

  // Event Form State
  const [formData, setFormData] = useState({
    university_id: '',
    event_name: '',
    city: '',
    venue: '',
    event_date: '',
    event_time: '',
    organizer: '',
    cta_url: '',
    study_levels: [] as string[]
  });

  const levelsOptions = ['Bachelors', 'Masters', 'MBA', 'PhD', 'Diploma'];

  // Initialization & Auth Guard
  useEffect(() => {
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      fetchInitialData();
    };
    initialize();
  }, [router]);

  async function fetchInitialData() {
    setLoading(true);
    const { data: unis } = await supabase.from('universities').select('*').order('name');
    const { data: evs } = await supabase.from('events').select('*, universities(name)').order('event_date', { ascending: true });
    const { data: clicks } = await supabase.from('analytics').select('*');
    
    if (unis) setUniversities(unis);
    if (evs) setEvents(evs);
    if (clicks) setAnalytics(clicks);
    setLoading(false);
  }

  // --- UNIVERSITY CRUD ACTIONS ---
  const handleUniSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUni.name || !newUni.country) return alert("Name and Country are required.");

    if (editingUniId) {
      const { error } = await supabase.from('universities').update(newUni).eq('id', editingUniId);
      if (error) alert(error.message);
      setEditingUniId(null);
    } else {
      const { error } = await supabase.from('universities').insert([newUni]);
      if (error) alert(error.message);
    }
    
    setNewUni({ name: '', country: '', logo_url: '' });
    fetchInitialData();
  };

  const startEditUni = (u: any) => {
    setEditingUniId(u.id);
    setNewUni({ name: u.name, country: u.country, logo_url: u.logo_url || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteUniversity = async (id: string) => {
    if (confirm('WARNING: Deleting a university will only work if it has NO active events. Delete events first. Proceed?')) {
      const { error } = await supabase.from('universities').delete().eq('id', id);
      if (error) alert("Could not delete. Check if events are still linked to this university.");
      fetchInitialData();
    }
  };

  // --- EVENT CRUD ACTIONS ---
  const toggleStudyLevel = (level: string) => {
    const updated = formData.study_levels.includes(level)
      ? formData.study_levels.filter(l => l !== level)
      : [...formData.study_levels, level];
    setFormData({ ...formData, study_levels: updated });
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (editingEventId) {
      const { error } = await supabase.from('events').update(formData).eq('id', editingEventId);
      if (error) alert(error.message);
      setEditingEventId(null);
    } else {
      const { error } = await supabase.from('events').insert([formData]);
      if (error) alert(error.message);
    }

    // Reset Form
    setFormData({ university_id: '', event_name: '', city: '', venue: '', event_date: '', event_time: '', organizer: '', cta_url: '', study_levels: [] });
    fetchInitialData();
    setLoading(false);
  };

  const startEditEvent = (ev: any) => {
    setEditingEventId(ev.id);
    setFormData({
      university_id: ev.university_id,
      event_name: ev.event_name,
      city: ev.city,
      venue: ev.venue || '',
      event_date: ev.event_date,
      event_time: ev.event_time,
      organizer: ev.organizer,
      cta_url: ev.cta_url,
      study_levels: ev.study_levels || []
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteEvent = async (id: string) => {
    if (confirm('Delete this event permanently?')) {
      await supabase.from('events').delete().eq('id', id);
      fetchInitialData();
    }
  };

  // --- BULK CSV PROCESSING ---
  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const formatted = results.data.map((row: any) => ({
            ...row,
            study_levels: row.study_levels ? JSON.parse(row.study_levels.replace(/'/g, '"')) : []
          }));
          const { error } = await supabase.from('events').insert(formatted);
          if (error) throw error;
          alert(`Successfully imported ${formatted.length} events!`);
          fetchInitialData();
        } catch (err: any) {
          alert("CSV Error: " + err.message);
        }
        setUploading(false);
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Admin Console</h1>
            <p className="text-slate-500 font-bold mt-1">Manage global university partnerships and event analytics.</p>
          </div>
          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
            className="bg-white text-red-500 border-2 border-red-50 px-8 py-3 rounded-2xl font-black hover:bg-red-500 hover:text-white transition-all shadow-sm"
          >
            SIGN OUT
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-10 mb-12 border-b-2 border-slate-200">
          <button onClick={() => setActiveTab('events')} className={`pb-5 font-black text-sm uppercase tracking-[0.15em] transition-all ${activeTab === 'events' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Events Dashboard</button>
          <button onClick={() => setActiveTab('manage')} className={`pb-5 font-black text-sm uppercase tracking-[0.15em] transition-all ${activeTab === 'manage' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>University Partners</button>
          <button onClick={() => setActiveTab('stats')} className={`pb-5 font-black text-sm uppercase tracking-[0.15em] transition-all ${activeTab === 'stats' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>📊 View Analytics</button>
        </div>

        {/* --- TAB 1: EVENTS --- */}
        {activeTab === 'events' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-10">
              
              {/* Bulk Upload Section */}
              <div className="bg-blue-700 p-10 rounded-[3rem] text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-2xl font-black mb-2">Bulk CSV Import</h3>
                  <p className="text-blue-100 font-medium mb-8">Upload dozens of events instantly via spreadsheet.</p>
                  <input 
                    type="file" accept=".csv" disabled={uploading} onChange={handleBulkUpload}
                    className="block w-full text-sm file:mr-4 file:py-3 file:px-8 file:rounded-2xl file:border-0 file:text-sm file:font-black file:bg-white file:text-blue-700 hover:file:bg-blue-50 cursor-pointer"
                  />
                  {uploading && <p className="mt-4 font-bold animate-pulse">Syncing with database...</p>}
                </div>
              </div>

              {/* Event Form */}
              <div className="bg-white p-10 md:p-12 rounded-[3.5rem] border-2 border-slate-100 shadow-sm">
                <h2 className="text-3xl font-black mb-10 text-slate-800 flex items-center gap-4">
                  {editingEventId ? <span className="text-orange-500">⚡ Editing Mode</span> : '✍️ Create New Event'}
                </h2>
                
                <form onSubmit={handleSubmitEvent} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block">Select Partner</label>
                    <select 
                      required className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-blue-50" 
                      value={formData.university_id} onChange={(e) => setFormData({...formData, university_id: e.target.value})}
                    >
                      <option value="">Choose a University...</option>
                      {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Event Title</label>
                    <input required placeholder="e.g. Masters Open Day" className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold" value={formData.event_name} onChange={(e) => setFormData({...formData, event_name: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">City</label>
                    <input required placeholder="e.g. Dubai" className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Venue</label>
                    <input required placeholder="e.g. Address Marina" className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold" value={formData.venue} onChange={(e) => setFormData({...formData, venue: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Event Date</label>
                    <input required type="date" className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-600" value={formData.event_date} onChange={(e) => setFormData({...formData, event_date: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Timing</label>
                    <input required placeholder="e.g. 4:00 PM - 8:00 PM" className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold" value={formData.event_time} onChange={(e) => setFormData({...formData, event_time: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Organizer</label>
                    <input required placeholder="e.g. IDP Education" className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold" value={formData.organizer} onChange={(e) => setFormData({...formData, organizer: e.target.value})} />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Registration Link (CTA)</label>
                    <input required type="url" placeholder="https://..." className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold" value={formData.cta_url} onChange={(e) => setFormData({...formData, cta_url: e.target.value})} />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-4 block">Qualified Study Levels</label>
                    <div className="flex flex-wrap gap-3">
                      {levelsOptions.map(l => (
                        <button 
                          type="button" key={l} onClick={() => toggleStudyLevel(l)}
                          className={`px-6 py-2.5 rounded-xl text-xs font-black border-2 transition-all ${formData.study_levels.includes(l) ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2 flex gap-4 mt-6">
                    <button className={`flex-1 p-6 rounded-[2rem] font-black text-white shadow-xl transition-all active:scale-95 ${editingEventId ? 'bg-orange-500 shadow-orange-100' : 'bg-slate-900 shadow-slate-200'}`}>
                      {editingEventId ? 'SAVE CHANGES' : 'PUBLISH LIVE'}
                    </button>
                    {editingEventId && (
                      <button type="button" onClick={() => setEditingEventId(null)} className="px-10 bg-slate-100 text-slate-500 rounded-[2rem] font-bold">Cancel</button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* Sidebar: Event Feed */}
            <div className="lg:col-span-4 space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tighter text-slate-400 flex items-center justify-between">
                Live Feed <span>{events.length}</span>
              </h2>
              <div className="space-y-4 max-h-[1200px] overflow-y-auto pr-3 scrollbar-hide">
                {events.map(ev => (
                  <div key={ev.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:border-blue-200 transition-all flex justify-between items-center">
                    <div className="max-w-[70%]">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{ev.universities?.name}</p>
                      <h3 className="text-sm font-bold text-slate-800 leading-tight truncate">{ev.event_name}</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">{ev.city} • {ev.event_date}</p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => startEditEvent(ev)} className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all">✏️</button>
                      <button onClick={() => deleteEvent(ev.id)} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: UNIVERSITIES --- */}
        {activeTab === 'manage' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-white p-12 rounded-[3.5rem] border-2 border-slate-100 shadow-sm h-fit">
              <h2 className="text-3xl font-black mb-10 text-slate-800">{editingUniId ? '⚡ Edit University' : '🏢 New University Partner'}</h2>
              <form onSubmit={handleUniSubmit} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Official Name</label>
                  <input required placeholder="e.g. University of Manchester" className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold" value={newUni.name} onChange={(e) => setNewUni({...newUni, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Country</label>
                  <input required placeholder="e.g. United Kingdom" className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold" value={newUni.country} onChange={(e) => setNewUni({...newUni, country: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Direct Logo URL</label>
                  <input placeholder="https://image-link.png" className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold" value={newUni.logo_url} onChange={(e) => setNewUni({...newUni, logo_url: e.target.value})} />
                </div>
                <button className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black text-lg hover:shadow-xl transition-all shadow-slate-200">
                  {editingUniId ? 'UPDATE PARTNER' : 'SAVE PARTNER'}
                </button>
                {editingUniId && <button type="button" onClick={() => { setEditingUniId(null); setNewUni({name:'', country:'', logo_url:''}); }} className="w-full font-bold text-slate-400">Cancel</button>}
              </form>
            </div>

            <div className="bg-white p-12 rounded-[3.5rem] border-2 border-slate-100 shadow-sm">
              <h2 className="text-2xl font-black mb-8 text-slate-800 tracking-tight">Partner Master List</h2>
              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-3">
                {universities.map(u => (
                  <div key={u.id} className="flex justify-between items-center p-5 hover:bg-slate-50 rounded-3xl transition-all border border-transparent hover:border-slate-100 group">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-white border border-slate-50 rounded-2xl p-2 flex items-center justify-center">
                        <img src={u.logo_url} className="max-w-full max-h-full object-contain" alt="" />
                      </div>
                      <div>
                        <p className="font-black text-slate-800">{u.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{u.country}</p>
                      </div>
                    </div>
                    <div className="flex gap-6 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => startEditUni(u)} className="text-blue-600 font-black text-xs uppercase tracking-widest">Edit</button>
                      <button onClick={() => deleteUniversity(u.id)} className="text-red-300 hover:text-red-500 font-black text-xs uppercase tracking-widest transition-colors">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 3: STATISTICS --- */}
        {activeTab === 'stats' && (
          <div className="bg-white p-12 md:p-16 rounded-[4rem] border-2 border-slate-100 shadow-sm">
            <h2 className="text-4xl font-black mb-4 tracking-tighter">Event Performance</h2>
            <p className="text-slate-400 font-bold mb-12">Tracking registration clicks per university event.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              <div className="bg-slate-900 p-12 rounded-[3rem] text-white flex flex-col justify-between h-64">
                <p className="text-slate-400 font-black text-xs uppercase tracking-[0.2em]">Total Clicks Across Site</p>
                <h3 className="text-7xl font-black tracking-tighter">{analytics.length}</h3>
              </div>
              <div className="bg-blue-600 p-12 rounded-[3rem] text-white flex flex-col justify-between h-64 shadow-2xl shadow-blue-100">
                <p className="text-blue-200 font-black text-xs uppercase tracking-[0.2em]">Active Live Listings</p>
                <h3 className="text-7xl font-black tracking-tighter">{events.length}</h3>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex justify-between items-center px-4">
                <h4 className="font-black text-slate-400 uppercase text-xs tracking-[0.2em]">Detailed Click Breakdown</h4>
                <p className="text-xs font-black text-blue-600">Clicks Per Event</p>
              </div>
              <div className="space-y-4">
                {events.map(ev => {
                  const count = analytics.filter(a => a.event_id === ev.id).length;
                  const percentage = analytics.length > 0 ? (count / analytics.length) * 100 : 0;
                  return (
                    <div key={ev.id} className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-10">
                      <div className="flex-1">
                        <p className="text-xl font-black text-slate-900 mb-1">{ev.event_name}</p>
                        <p className="text-xs text-blue-600 font-black uppercase tracking-widest">{ev.universities?.name}</p>
                      </div>
                      <div className="flex items-center gap-10 w-full md:w-auto">
                        <div className="flex-1 md:w-80 h-5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="h-full bg-blue-600 rounded-full transition-all duration-1000 shadow-lg" 
                            style={{width: `${percentage}%`}}
                          ></div>
                        </div>
                        <div className="text-5xl font-black text-slate-900 w-24 text-right tabular-nums">{count}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}