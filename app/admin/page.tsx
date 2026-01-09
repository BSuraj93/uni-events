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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingUniId, setEditingUniId] = useState<string | null>(null);

  // Form States
  const [newUni, setNewUni] = useState({ name: '', country: '' });
  const [formData, setFormData] = useState({
    university_id: '', event_name: '', city: '', venue: '',
    event_date: '', event_time: '', organizer: '', cta_url: '', study_levels: [] as string[]
  });

  const levelsOptions = ['Bachelors', 'Masters', 'MBA', 'PhD', 'Diploma'];

  useEffect(() => {
    checkUser();
    fetchInitialData();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) router.push('/login');
  }

  async function fetchInitialData() {
    const { data: unis } = await supabase.from('universities').select('*').order('name');
    const { data: evs } = await supabase.from('events').select('*, universities(name)').order('event_date', { ascending: true });
    if (unis) setUniversities(unis);
    if (evs) setEvents(evs);
  }

  // --- EVENT ACTIONS ---
  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (editingId) {
      await supabase.from('events').update(formData).eq('id', editingId);
      setEditingId(null);
    } else {
      await supabase.from('events').insert([formData]);
    }
    setFormData({ university_id: '', event_name: '', city: '', venue: '', event_date: '', event_time: '', organizer: '', cta_url: '', study_levels: [] });
    fetchInitialData();
    setLoading(false);
  };

  const startEditEvent = (ev: any) => {
    setEditingId(ev.id);
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
    if (confirm('Delete this event?')) {
      await supabase.from('events').delete().eq('id', id);
      fetchInitialData();
    }
  };

  // --- UNIVERSITY ACTIONS ---
  const handleUniSubmit = async () => {
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

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const formatted = results.data.map((row: any) => ({
          ...row,
          study_levels: row.study_levels ? JSON.parse(row.study_levels.replace(/'/g, '"')) : []
        }));
        await supabase.from('events').insert(formatted);
        fetchInitialData();
        setUploading(false);
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black">Admin Console</h1>
          <button onClick={() => { supabase.auth.signOut(); router.push('/login'); }} className="text-red-500 font-bold bg-white px-4 py-2 rounded-xl border border-red-100">Logout</button>
        </div>

        <div className="flex gap-6 mb-8 border-b border-slate-200">
          <button onClick={() => setActiveTab('events')} className={`pb-4 font-bold transition-all ${activeTab === 'events' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-slate-400'}`}>Events & Bulk Upload</button>
          <button onClick={() => setActiveTab('manage')} className={`pb-4 font-bold transition-all ${activeTab === 'manage' ? 'border-b-4 border-blue-600 text-blue-600' : 'text-slate-400'}`}>Manage Universities</button>
        </div>

        {activeTab === 'events' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-lg">
                <h2 className="font-bold mb-2">Bulk Upload</h2>
                <input type="file" accept=".csv" onChange={handleBulkUpload} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white file:text-blue-700 hover:file:bg-blue-50 cursor-pointer" />
                {uploading && <p className="mt-2 text-xs animate-pulse">Uploading data...</p>}
              </div>

              <div className="bg-white p-8 rounded-[2rem] border shadow-sm">
                <h2 className="text-xl font-bold mb-6">{editingId ? '⚡ Editing Event' : '✍️ Add Single Event'}</h2>
                <form onSubmit={handleSubmitEvent} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <select required className="md:col-span-2 p-4 bg-slate-50 border rounded-2xl font-bold" value={formData.university_id} onChange={(e) => setFormData({...formData, university_id: e.target.value})}>
                    <option value="">Select University</option>
                    {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <input required placeholder="Event Name" className="p-4 bg-slate-50 border rounded-2xl font-bold" type="text" value={formData.event_name} onChange={(e) => setFormData({...formData, event_name: e.target.value})} />
                  <input required placeholder="City" className="p-4 bg-slate-50 border rounded-2xl font-bold" type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
                  <input required placeholder="Venue" className="p-4 bg-slate-50 border rounded-2xl font-bold" type="text" value={formData.venue} onChange={(e) => setFormData({...formData, venue: e.target.value})} />
                  <input required className="p-4 bg-slate-50 border rounded-2xl font-bold" type="date" value={formData.event_date} onChange={(e) => setFormData({...formData, event_date: e.target.value})} />
                  <input required placeholder="Time" className="p-4 bg-slate-50 border rounded-2xl font-bold" type="text" value={formData.event_time} onChange={(e) => setFormData({...formData, event_time: e.target.value})} />
                  <input required placeholder="Organizer" className="p-4 bg-slate-50 border rounded-2xl font-bold" type="text" value={formData.organizer} onChange={(e) => setFormData({...formData, organizer: e.target.value})} />
                  <input required placeholder="Reg URL" className="md:col-span-2 p-4 bg-slate-50 border rounded-2xl font-bold" type="url" value={formData.cta_url} onChange={(e) => setFormData({...formData, cta_url: e.target.value})} />
                  <div className="md:col-span-2 flex flex-wrap gap-2">
                    {levelsOptions.map(l => (
                      <button type="button" key={l} onClick={() => {
                        const updated = formData.study_levels.includes(l) ? formData.study_levels.filter(x => x !== l) : [...formData.study_levels, l];
                        setFormData({...formData, study_levels: updated});
                      }} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${formData.study_levels.includes(l) ? 'bg-blue-600 text-white' : 'bg-slate-50'}`}>{l}</button>
                    ))}
                  </div>
                  <button className={`md:col-span-2 p-5 rounded-2xl font-bold text-white shadow-lg ${editingId ? 'bg-orange-500' : 'bg-blue-700'}`}>
                    {editingId ? 'Update Event' : 'Post Event'}
                  </button>
                  {editingId && <button type="button" onClick={() => setEditingId(null)} className="md:col-span-2 text-slate-400 font-bold">Cancel Edit</button>}
                </form>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="font-bold flex items-center gap-2"><span>📋</span> Active List</h2>
              {events.map(ev => (
                <div key={ev.id} className="bg-white p-4 rounded-2xl border flex justify-between items-center group shadow-sm hover:border-blue-300 transition-all">
                  <div>
                    <h3 className="text-sm font-bold">{ev.event_name}</h3>
                    <p className="text-[10px] text-blue-600 font-bold uppercase">{ev.universities?.name}</p>
                    <p className="text-[10px] text-slate-400">{ev.city} • {ev.event_date}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => startEditEvent(ev)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">✏️</button>
                    <button onClick={() => deleteEvent(ev.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2rem] border shadow-sm h-fit">
              <h2 className="text-xl font-bold mb-6">{editingUniId ? '✏️ Edit University' : '🏢 New University'}</h2>
              <input placeholder="Name" className="w-full p-4 bg-slate-50 border rounded-2xl mb-4 font-bold" value={newUni.name} onChange={(e) => setNewUni({...newUni, name: e.target.value})} />
              <input placeholder="Country" className="w-full p-4 bg-slate-50 border rounded-2xl mb-4 font-bold" value={newUni.country} onChange={(e) => setNewUni({...newUni, country: e.target.value})} />
              <button onClick={handleUniSubmit} className="w-full bg-slate-900 text-white p-4 rounded-2xl font-bold hover:bg-black transition-all">
                {editingUniId ? 'Update University' : 'Save University'}
              </button>
              {editingUniId && <button onClick={() => { setEditingUniId(null); setNewUni({name:'', country:''}); }} className="w-full mt-4 text-slate-400 font-bold">Cancel</button>}
            </div>
            <div className="bg-white p-8 rounded-[2rem] border shadow-sm max-h-[600px] overflow-y-auto">
              <h2 className="font-bold mb-4">University Master List</h2>
              {universities.map(u => (
                <div key={u.id} className="flex justify-between items-center p-4 border-b group">
                  <span className="font-bold">{u.name} <span className="text-xs text-slate-400 ml-2 font-normal">{u.country}</span></span>
                  <div className="flex gap-2">
                    <button onClick={() => startEditUni(u)} className="text-blue-400 hover:text-blue-600 text-sm font-bold">Edit</button>
                    <button onClick={() => deleteUniversity(u.id)} className="text-red-300 hover:text-red-500 text-sm font-bold">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}