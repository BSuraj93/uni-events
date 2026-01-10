'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'events' | 'manage'>('events');
  const [universities, setUniversities] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Edit State Trackers
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingUniId, setEditingUniId] = useState<string | null>(null);

  // Form States
  const [newUni, setNewUni] = useState({ name: '', country: '' });
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

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      }
    };
    checkUser();
    fetchInitialData();
  }, [router]);

  async function fetchInitialData() {
    const { data: unis } = await supabase.from('universities').select('*').order('name');
    const { data: evs } = await supabase.from('events').select('*, universities(name)').order('event_date', { ascending: true });
    if (unis) setUniversities(unis);
    if (evs) setEvents(evs);
  }

  // --- UNIVERSITY CRUD LOGIC ---
  const handleUniSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUni.name) return;

    if (editingUniId) {
      await supabase.from('universities').update(newUni).eq('id', editingUniId);
      setEditingUniId(null);
    } else {
      await supabase.from('universities').insert([newUni]);
    }
    setNewUni({ name: '', country: '' });
    fetchInitialData();
  };

  const startEditUni = (uni: any) => {
    setEditingUniId(uni.id);
    setNewUni({ name: uni.name, country: uni.country });
  };

  const deleteUniversity = async (id: string) => {
    if (confirm('Warning: Deleting a university will fail if it has active events. Delete events first. Continue?')) {
      const { error } = await supabase.from('universities').delete().eq('id', id);
      if (error) alert("Error: Remove all events linked to this university first.");
      fetchInitialData();
    }
  };

  // --- EVENT CRUD LOGIC ---
  const handleLevelChange = (level: string) => {
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

  // --- BULK UPLOAD LOGIC ---
  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const formattedData = results.data.map((row: any) => ({
            ...row,
            // Safe parsing for study_levels array
            study_levels: row.study_levels ? JSON.parse(row.study_levels.replace(/'/g, '"')) : []
          }));

          const { error } = await supabase.from('events').insert(formattedData);
          if (error) throw error;
          
          alert(`Success! Imported ${formattedData.length} events.`);
          fetchInitialData();
        } catch (err: any) {
          alert('CSV Error: Ensure headers match exactly and study_levels are formatted like ["Bachelors"]. ' + err.message);
        }
        setUploading(false);
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Dashboard</h1>
            <p className="text-slate-500 font-medium">Manage your university events and partners.</p>
          </div>
          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
            className="bg-white border border-red-100 text-red-500 px-6 py-2 rounded-2xl font-bold hover:bg-red-50 transition-all shadow-sm"
          >
            Sign Out
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-8 mb-10 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('events')}
            className={`pb-4 text-sm font-bold transition-all ${activeTab === 'events' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-slate-400'}`}
          >
            Events & Bulk Upload
          </button>
          <button 
            onClick={() => setActiveTab('manage')}
            className={`pb-4 text-sm font-bold transition-all ${activeTab === 'manage' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-slate-400'}`}
          >
            Universities Master List
          </button>
        </div>

        {activeTab === 'events' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            {/* Left Column: Form & Upload */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Bulk Upload Box */}
              <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-100 relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-xl font-bold mb-2">Bulk Import Events</h2>
                  <p className="text-blue-100 text-sm mb-6">Select a .csv file to add multiple events at once.</p>
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleBulkUpload} 
                    disabled={uploading}
                    className="block w-full text-sm file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-white file:text-blue-700 hover:file:bg-blue-50 cursor-pointer"
                  />
                  {uploading && <p className="mt-4 text-xs font-bold animate-pulse text-blue-200">Processing file... please wait.</p>}
                </div>
              </div>

              {/* Manual Form */}
              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                  {editingEventId ? '⚡ Edit Event' : '✍️ Add New Event'}
                </h2>
                
                <form onSubmit={handleSubmitEvent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">University Partner</label>
                    <select 
                      required 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10" 
                      value={formData.university_id} 
                      onChange={(e) => setFormData({...formData, university_id: e.target.value})}
                    >
                      <option value="">Select a University...</option>
                      {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>

                  <input required placeholder="Event Name" className="p-4 bg-slate-50 border rounded-2xl font-bold" type="text" value={formData.event_name} onChange={(e) => setFormData({...formData, event_name: e.target.value})} />
                  <input required placeholder="City" className="p-4 bg-slate-50 border rounded-2xl font-bold" type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
                  <input required placeholder="Venue (e.g. Hilton Hotel)" className="p-4 bg-slate-50 border rounded-2xl font-bold" type="text" value={formData.venue} onChange={(e) => setFormData({...formData, venue: e.target.value})} />
                  <input required className="p-4 bg-slate-50 border rounded-2xl font-bold" type="date" value={formData.event_date} onChange={(e) => setFormData({...formData, event_date: e.target.value})} />
                  <input required placeholder="Time (e.g. 10 AM - 5 PM)" className="p-4 bg-slate-50 border rounded-2xl font-bold" type="text" value={formData.event_time} onChange={(e) => setFormData({...formData, event_time: e.target.value})} />
                  <input required placeholder="Organizer" className="p-4 bg-slate-50 border rounded-2xl font-bold" type="text" value={formData.organizer} onChange={(e) => setFormData({...formData, organizer: e.target.value})} />
                  <input required placeholder="Registration URL" className="md:col-span-2 p-4 bg-slate-50 border rounded-2xl font-bold" type="url" value={formData.cta_url} onChange={(e) => setFormData({...formData, cta_url: e.target.value})} />

                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Study Levels</label>
                    <div className="flex flex-wrap gap-2">
                      {levelsOptions.map(l => (
                        <button 
                          type="button" 
                          key={l} 
                          onClick={() => handleLevelChange(l)} 
                          className={`px-5 py-2 rounded-xl text-xs font-bold border transition-all ${formData.study_levels.includes(l) ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500'}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2 flex gap-4 mt-4">
                    <button 
                      disabled={loading} 
                      className={`flex-1 p-5 rounded-2xl font-black text-white transition-all active:scale-95 shadow-lg ${editingEventId ? 'bg-orange-500 shadow-orange-100' : 'bg-blue-700 shadow-blue-100'}`}
                    >
                      {loading ? 'Saving...' : editingEventId ? 'Update Event Details' : 'Publish Event Live'}
                    </button>
                    {editingEventId && (
                      <button 
                        type="button" 
                        onClick={() => { setEditingEventId(null); setFormData({ university_id: '', event_name: '', city: '', venue: '', event_date: '', event_time: '', organizer: '', cta_url: '', study_levels: [] }); }}
                        className="bg-slate-100 text-slate-500 px-8 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Live List */}
            <div className="space-y-6">
              <h2 className="text-xl font-black flex items-center gap-2 uppercase tracking-tighter">
                <span>📋</span> Active Events ({events.length})
              </h2>
              <div className="space-y-4 max-h-[1000px] overflow-y-auto pr-2 scrollbar-hide">
                {events.map(ev => (
                  <div key={ev.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm group hover:border-blue-200 transition-all flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{ev.universities?.name}</p>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">{ev.event_name}</h3>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">{ev.city} • {ev.event_date}</p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => startEditEvent(ev)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all">✏️</button>
                      <button onClick={() => deleteEvent(ev.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Master List Management Tab */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border shadow-sm h-fit">
              <h2 className="text-2xl font-black mb-6">{editingUniId ? '✏️ Edit University' : '🏢 New University Partner'}</h2>
              <form onSubmit={handleUniSubmit} className="space-y-4">
                <input placeholder="University Full Name" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={newUni.name} onChange={(e) => setNewUni({...newUni, name: e.target.value})} />
                <input placeholder="Country" className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" value={newUni.country} onChange={(e) => setNewUni({...newUni, country: e.target.value})} />
                <button className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-200">
                  {editingUniId ? 'Update University' : 'Save Partner'}
                </button>
                {editingUniId && (
                  <button type="button" onClick={() => { setEditingUniId(null); setNewUni({name:'', country:''}); }} className="w-full text-slate-400 font-bold pt-2">Cancel Edit</button>
                )}
              </form>
            </div>

            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border shadow-sm">
              <h2 className="text-2xl font-black mb-6">Partner Database</h2>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {universities.map(u => (
                  <div key={u.id} className="flex justify-between items-center p-4 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100 group">
                    <span className="font-bold text-slate-700">{u.name} <span className="text-xs text-slate-300 font-normal ml-2">({u.country})</span></span>
                    <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => startEditUni(u)} className="text-blue-500 font-bold text-xs uppercase">Edit</button>
                      <button onClick={() => deleteUniversity(u.id)} className="text-red-300 hover:text-red-500 font-bold text-xs uppercase">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}