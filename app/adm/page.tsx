'use client';

import { useState, useEffect } from 'react';
import NextImage from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { getSupabaseClient } from '@/lib/supabase';

const ADMIN_EMAIL = 'frameforgeone@gmail.com';

export default function AdminPortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [adminData, setAdminData] = useState<any[]>([]);
  const supabase = getSupabaseClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (data.success) {
        setIsLoggedIn(true);
        localStorage.setItem('adm_session', 'true');
        fetchAdminData();
        toast.success('Admin access granted');
      } else {
        toast.error(data.error || 'Invalid credentials');
      }
    } catch (err) {
      toast.error('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdminData = async () => {
    const { data, error } = await supabase
      .from('elavarkum_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setAdminData(data);
  };

  const handleClearRecords = async () => {
    if (!confirm('Are you sure you want to purge all records?')) return;
    const { error } = await supabase
      .from('elavarkum_requests')
      .delete()
      .neq('email', ADMIN_EMAIL);
    if (!error) {
      toast.success('All records purged');
      fetchAdminData();
    } else {
      toast.error('Purge failed');
    }
  };

  const handleAddTry = async (userEmail: string, currentTries: number) => {
    const { error } = await supabase
      .from('elavarkum_requests')
      .update({ tries_left: currentTries + 1 })
      .eq('email', userEmail);
    if (!error) {
      toast.success(`Added try to ${userEmail}`);
      fetchAdminData();
    } else {
      toast.error('Update failed');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('adm_session');
  };

  useEffect(() => {
    if (localStorage.getItem('adm_session') === 'true') {
      setIsLoggedIn(true);
      fetchAdminData();
    }
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-12">
            <NextImage src="https://ellavarkkumai.frameforge.one/LOGO.png" alt="Logo" width={64} height={64} className="mx-auto mb-6" unoptimized />
            <h1 className="text-4xl font-heading font-black tracking-tight">Admin <span className="text-blue-600">Portal</span></h1>
            <p className="text-slate-500 mt-2">Secure access to Ellavarkkum AI records</p>
          </div>

          <div className="glass-panel p-10 rounded-[40px] shadow-2xl border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#e1007a] via-[#0077ff] to-[#e1007a]" />
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-4">Email</label>
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@frameforge.one"
                  className="w-full px-6 py-4 rounded-full border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-black text-slate-400 ml-4">Password</label>
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-6 py-4 rounded-full border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>
              <button 
                disabled={isLoading}
                className="w-full py-5 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? 'Authenticating...' : 'Enter Dashboard'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 lg:p-20">
      <nav className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 mb-20">
        <div className="flex items-center gap-4">
          <NextImage src="https://ellavarkkumai.frameforge.one/LOGO.png" alt="Logo" width={48} height={48} unoptimized />
          <div>
            <h2 className="text-2xl font-heading font-black tracking-tighter">ADMIN <span className="text-blue-600">DASHBOARD</span></h2>
            <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">Ellavarkkum AI System</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={fetchAdminData} className="px-6 py-3 bg-white text-slate-700 rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-all">Refresh</button>
          <button onClick={handleLogout} className="px-6 py-3 bg-slate-900 text-white rounded-full text-sm font-bold shadow-lg hover:bg-slate-800 transition-all">Sign Out</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto">
        <div className="glass-panel p-8 md:p-12 rounded-[50px] border border-white shadow-2xl overflow-hidden bg-white/80 backdrop-blur-xl">
          <div className="flex justify-between items-center mb-12">
            <h3 className="text-3xl font-heading font-black">User Records</h3>
            <button onClick={handleClearRecords} className="px-6 py-3 bg-red-50 text-red-600 rounded-full text-sm font-bold hover:bg-red-100 transition-all border border-red-100">Purge All Records</button>
          </div>

          <div className="overflow-x-auto -mx-8 md:-mx-12">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-100/50">
                  <th className="py-6 px-12 text-[10px] uppercase tracking-widest font-black text-slate-400">User</th>
                  <th className="py-6 px-12 text-[10px] uppercase tracking-widest font-black text-slate-400 text-center">Remaining Tries</th>
                  <th className="py-6 px-12 text-[10px] uppercase tracking-widest font-black text-slate-400 text-center">Actions</th>
                  <th className="py-6 px-12 text-[10px] uppercase tracking-widest font-black text-slate-400">Identity Status</th>
                  <th className="py-6 px-12 text-[10px] uppercase tracking-widest font-black text-slate-400">Joined</th>
                </tr>
              </thead>
              <tbody>
                {adminData.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-6 px-12">
                      <div className="font-bold text-slate-900">{row.name || 'No Name'}</div>
                      <div className="text-xs text-slate-500 font-medium">{row.email}</div>
                    </td>
                    <td className="py-6 px-12 text-center">
                      <span className={`inline-block px-4 py-1 rounded-full text-xs font-black ${row.tries_left > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {row.tries_left}
                      </span>
                    </td>
                    <td className="py-6 px-12 text-center">
                      <button 
                        onClick={() => handleAddTry(row.email, row.tries_left)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    </td>
                    <td className="py-6 px-12">
                      <span className={`uppercase text-[10px] font-black tracking-widest ${row.status === 'generated' ? 'text-blue-600' : 'text-slate-400'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-6 px-12 text-slate-400 text-xs font-medium">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
