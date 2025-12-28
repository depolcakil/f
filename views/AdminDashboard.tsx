
import React, { useState, useEffect } from 'react';
import { User, RegistrationStatus } from '../types';
import * as api from '../services/api'; // Correctly import the API service
import { ICONS as UI_ICONS, APP_NAME } from '../constants';
import { Footer } from '../components/Footer';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [tab, setTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [loading, setLoading] = useState(true);

  // --- REFACTORED DATA FETCHING ---
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // For this example, we'll fetch all users and filter on the client.
      // In a real app, you might have dedicated API endpoints for each status.
      const { data: pending } = await api.getPendingDrivers();
      // NOTE: We need API endpoints for approved/rejected users to show them.
      // For now, we will just show the pending ones.
      setUsers(pending);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []); // Fetch users on component mount

  const handleStatusChange = async (userId: string, status: RegistrationStatus) => {
    try {
      if (status === RegistrationStatus.APPROVED) {
        await api.approveDriver(userId);
      } else {
        // We'd need a 'rejectDriver' API endpoint for this.
        console.warn("Reject functionality not yet implemented in API.");
      }
      // Refresh the user list after making a change
      fetchUsers();
    } catch (error) {
      console.error("Failed to update user status:", error);
    }
  };
  // --- END REFACTOR ---

  const filteredUsers = users.filter(u => u.status === tab);

  return (
    <div className="min-h-screen flex flex-col mesh-gradient">
      <div className="flex flex-grow relative">
        {/* Sidebar remains the same */}
        <aside className="w-80 bg-slate-950 text-white flex flex-col fixed h-full z-10 shadow-2xl transition-all duration-700 border-r border-white/5">
          <div className="p-10 flex items-center gap-4 border-b border-white/5">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-900/50">
              <UI_ICONS.Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="font-black text-2xl tracking-tighter block">{APP_NAME}</span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 opacity-60">Control Hub</span>
            </div>
          </div>
          <nav className="flex-grow p-8 space-y-4">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 px-4">Management</div>
            <button className="w-full flex items-center gap-5 px-6 py-5 bg-indigo-600 rounded-3xl font-black text-sm shadow-2xl shadow-indigo-900/60 transition-all hover:scale-[1.03] active:scale-95">
              <UI_ICONS.User className="w-6 h-6" />
              Verification Queue
            </button>
            <button className="w-full flex items-center gap-5 px-6 py-5 text-slate-400 hover:bg-slate-900 rounded-3xl transition-all hover:text-white group font-bold text-sm">
              <UI_ICONS.Truck className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              Real-time Fleet
            </button>
            <button className="w-full flex items-center gap-5 px-6 py-5 text-slate-400 hover:bg-slate-900 rounded-3xl transition-all hover:text-white font-bold text-sm">
              <UI_ICONS.Settings className="w-6 h-6" />
              Network Safety
            </button>
          </nav>
          <div className="p-8 border-t border-white/5">
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-5 px-6 py-5 text-red-400 hover:bg-red-400/10 rounded-3xl transition-all font-black text-sm group uppercase tracking-widest"
            >
              <UI_ICONS.LogOut className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow ml-80 p-12 animate-entrance">
          <header className="flex justify-between items-end mb-16">
            <div>
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">Verification Center</h1>
              <p className="text-xl text-slate-500 font-medium">Screening platform participants.</p>
            </div>
            {/* ... user display remains the same ... */}
          </header>

          <div className="bg-white rounded-[3rem] shadow-2xl shadow-indigo-900/5 border border-slate-100 overflow-hidden mb-20 animate-entrance animate-delay-100">
            <div className="flex bg-slate-50/80 backdrop-blur-md border-b border-slate-100">
              {(['PENDING', 'APPROVED', 'REJECTED'] as const).map(t => (
                <button 
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-12 py-8 font-black text-xs uppercase tracking-[0.2em] transition-all border-b-4 relative ${tab === t ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                >
                  {t} 
                  <span className={`ml-3 px-2.5 py-1 rounded-lg text-[10px] ${tab === t ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                    {users.filter(u => u.status === t).length}
                  </span>
                </button>
              ))}
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full">
                {/* ... table head remains the same ... */}
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-10 py-32 text-center text-slate-400 font-medium">Loading participants...</td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-10 py-32 text-center">
                        <div className="max-w-md mx-auto">
                          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                            <UI_ICONS.CheckCircle className="w-12 h-12 text-slate-200" />
                          </div>
                          <h3 className="text-2xl font-black text-slate-900 mb-3">All Clear</h3>
                          <p className="text-slate-400 font-medium">There are currently no participants in the {tab.toLowerCase()} state.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, idx) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-all group animate-entrance" style={{ animationDelay: `${idx * 80}ms` }}>
                        {/* ... table row data remains the same ... */}
                        <td className="px-10 py-8 text-right space-x-3">
                          {tab === 'PENDING' && (
                            <>
                              <button 
                                onClick={() => handleStatusChange(u.id, RegistrationStatus.APPROVED)}
                                className="px-8 py-3.5 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleStatusChange(u.id, RegistrationStatus.REJECTED)}
                                className="px-8 py-3.5 bg-slate-100 text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all active:scale-95"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {/* ... other actions remain the same ... */}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
      <div className="ml-80">
        <Footer />
      </div>
    </div>
  );
};
