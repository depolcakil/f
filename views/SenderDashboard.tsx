
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import io from 'socket.io-client';
import { User, TruckStatus, AidRequest, RequestStatus } from '../types';
import { store } from '../store';
import { ICONS as UI_ICONS, APP_NAME } from '../constants';
import { Footer } from '../components/Footer';

// Fix for default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const LiveLocationMap: React.FC<{ driverId: string | null; driver?: User | null }> = ({ driverId, driver }) => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(driver?.truckDetails?.location || null);

  useEffect(() => {
    const socket = io('http://localhost:5000');

    socket.on('locationUpdate', (data: { userId: string; clientId?: string; licensePlate?: string; location: { lat: number; lng: number } }) => {
      if (!driverId) return;
      // compare as strings to handle different id formats (local vs backend)
      if (String(data.userId) === String(driverId) || String(data.clientId || '') === String(driverId)) {
        setLocation(data.location);
        return;
      }
      // fallback: match by license plate if the frontend has that info
      if (driver?.truckDetails?.licensePlate && data.licensePlate && String(data.licensePlate) === String(driver.truckDetails.licensePlate)) {
        setLocation(data.location);
      }
    });

    // listen for local location updates (from same-browser local store) to support local-id workflows
    const localHandler = (e: any) => {
      const d = e?.detail;
      if (!d || !driverId) return;
      if (String(d.userId) === String(driverId)) {
        setLocation(d.location);
      }
    };
    window.addEventListener('localLocationUpdate', localHandler);

    return () => {
      socket.disconnect();
      window.removeEventListener('localLocationUpdate', localHandler as EventListener);
    };
  }, [driverId]);

  if (!location) {
    return <div className="bg-black h-[500px] rounded-[3rem] flex items-center justify-center text-white">Awaiting GPS signal...</div>;
  }

  return (
    <MapContainer center={[location.lat, location.lng]} zoom={13} style={{ height: '500px', width: '100%', borderRadius: '3rem' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[location.lat, location.lng]}>
        <Popup>{driver?.name || 'Driver'}'s Location</Popup>
      </Marker>
    </MapContainer>
  );
};

interface SenderDashboardProps {
  user: User;
  onLogout: () => void;
}

export const SenderDashboard: React.FC<SenderDashboardProps> = ({ user, onLogout }) => {
  const [availableTrucks, setAvailableTrucks] = useState<User[]>([]);
  const [selectedTruck, setSelectedTruck] = useState<User | null>(null);
  const [activeRequests, setActiveRequests] = useState<AidRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [trackingRequest, setTrackingRequest] = useState<AidRequest | null>(null);
  
  const [form, setForm] = useState({
    aidType: '',
    quantity: '',
    destination: '',
    urgency: 'Medium' as const
  });

  const fetchData = () => {
    const allUsers = store.getUsers();
    setAvailableTrucks(allUsers.filter(u => u.role === 'DRIVER' && u.truckDetails?.currentStatus === TruckStatus.READY));
    const allRequests = store.getRequests();
    setActiveRequests(allRequests.filter(r => r.senderId === user.id));
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [user.id]);

  const handleSubmitAid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTruck) return;

    const newRequest: AidRequest = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: user.id,
      driverId: selectedTruck.id,
      aidType: form.aidType,
      quantity: form.quantity,
      destination: form.destination,
      urgency: form.urgency,
      status: RequestStatus.PENDING,
      createdAt: Date.now()
    };

    const currentRequests = store.getRequests();
    store.saveRequests([newRequest, ...currentRequests]);
    
    store.addNotification({
      userId: selectedTruck.id,
      title: 'High Priority Deployment!',
      message: `${user.organizationDetails?.name} assigned a mission: ${form.aidType}.`,
      type: 'INFO'
    });

    setShowForm(false);
    setSelectedTruck(null);
    setForm({ aidType: '', quantity: '', destination: '', urgency: 'Medium' });
    fetchData();
  };

  return (
    <div className="min-h-screen flex flex-col mesh-gradient">
      <header className="glass-card border-b border-white/50 px-10 py-6 flex justify-between items-center sticky top-0 z-40 mx-6 mt-6 rounded-[2.5rem] shadow-2xl shadow-indigo-900/5">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-xl shadow-indigo-200">
            <UI_ICONS.Box className="w-7 h-7" />
          </div>
          <div>
            <span className="font-black text-2xl tracking-tighter text-slate-900 block">{APP_NAME} Sender</span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 opacity-60">Operations Hub</span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-right hidden sm:block border-r border-slate-200 pr-8">
            <p className="text-lg font-black text-slate-900 leading-tight">{user.organizationDetails?.name}</p>
            <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">{user.organizationDetails?.type}</p>
          </div>
          <button onClick={onLogout} className="text-slate-400 hover:text-red-600 transition-all p-3 rounded-2xl hover:bg-red-50 active:scale-90">
            <UI_ICONS.LogOut className="w-7 h-7" />
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto w-full p-10 md:p-14 flex-grow grid lg:grid-cols-12 gap-12 animate-entrance">
        
        {/* Available Trucks List (Radar) */}
        <div className="lg:col-span-4 space-y-10">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4 tracking-tighter">
              <div className="p-2 bg-indigo-100 rounded-2xl">
                <UI_ICONS.Truck className="w-6 h-6 text-indigo-600" />
              </div>
              Fleet Radar
            </h2>
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-2xl text-xs font-black uppercase tracking-widest border border-emerald-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="bg-emerald-600 rounded-full h-2 w-2"></span>
              </span>
              {availableTrucks.length} Online
            </div>
          </div>
          
          <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
            {availableTrucks.length === 0 ? (
              <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-slate-100 text-center animate-entrance">
                <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <UI_ICONS.Truck className="w-10 h-10 text-slate-200" />
                </div>
                <p className="text-xl font-black text-slate-400 mb-2">No Signal Detected</p>
                <p className="text-sm text-slate-400 font-medium">Listening for active transponders in your region...</p>
              </div>
            ) : (
              availableTrucks.map((truck, idx) => (
                <div 
                  key={truck.id} 
                  className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-indigo-900/5 hover:shadow-indigo-500/10 transition-all cursor-pointer group animate-entrance relative overflow-hidden"
                  style={{ animationDelay: `${idx * 100}ms` }}
                  onClick={() => {
                    setSelectedTruck(truck);
                    setShowForm(true);
                  }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
                  <div className="flex justify-between items-start mb-8 relative z-10">
                    <div className="w-16 h-16 bg-slate-100 rounded-[1.5rem] flex items-center justify-center text-slate-600 font-black text-2xl group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-6 transition-all shadow-sm">
                      {truck.name[0]}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 mb-3 uppercase tracking-widest">Available</span>
                      <p className="text-xs text-slate-400 font-black font-mono tracking-tighter">{truck.truckDetails?.licensePlate}</p>
                    </div>
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors mb-2 tracking-tight">{truck.name}</h4>
                  <p className="text-sm text-slate-500 mb-8 font-medium flex items-center gap-2">
                    <UI_ICONS.Settings className="w-4 h-4 text-indigo-400" />
                    {truck.truckDetails?.model} • 10 Ton Load Cap
                  </p>
                  <button className="w-full py-4.5 bg-slate-50 text-slate-900 text-xs font-black uppercase tracking-[0.3em] rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all active:scale-95 shadow-sm border border-slate-100 group-hover:border-indigo-600 group-hover:shadow-xl group-hover:shadow-indigo-500/20">
                    Deploy Unit
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Global Missions Area */}
        <div className="lg:col-span-8 space-y-12">
          {trackingRequest ? (
            <div className="bg-slate-900 p-12 rounded-[3.5rem] shadow-3xl animate-entrance duration-700 glow-blue">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-4">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="bg-blue-500 rounded-full h-2 w-2"></span>
                    </span>
                    Secure Link Established
                  </div>
                  <h3 className="text-5xl font-black text-white tracking-tighter">Live Mission Feed</h3>
                </div>
                <button 
                  onClick={() => setTrackingRequest(null)}
                  className="p-4 bg-white/5 hover:bg-white/10 hover:text-red-400 rounded-3xl transition-all text-slate-400 active:scale-90 border border-white/5"
                >
                   <span className="text-2xl font-black leading-none">✕</span>
                </button>
              </div>

              <div className="relative mb-12 shadow-2xl group border border-white/5 rounded-[3rem]">
                <LiveLocationMap driverId={trackingRequest?.driverId || null} driver={availableTrucks.find(t => t.id === trackingRequest?.driverId) || null} />
              </div>

              <div className="grid grid-cols-3 gap-8">
                 <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 shadow-inner">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3">Deployment Hub</p>
                    <p className="text-2xl font-black text-blue-400 uppercase tracking-tight">Active Transit</p>
                 </div>
                 <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 shadow-inner">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3">Sync ETA</p>
                    <p className="text-2xl font-black text-white uppercase tracking-tight">02:14:05</p>
                 </div>
                 <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 shadow-inner">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-3">Cruise Velocity</p>
                    <p className="text-2xl font-black text-white uppercase tracking-tight">62 km/h</p>
                 </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-16 rounded-[4rem] shadow-2xl shadow-indigo-900/5 border border-slate-50">
              <div className="flex justify-between items-end mb-16">
                <div>
                  <h2 className="text-4xl font-black mb-4 tracking-tighter text-slate-900">Shipment Log</h2>
                  <p className="text-lg text-slate-500 font-medium">Monitoring your ongoing aid deployments.</p>
                </div>
                <div className="flex -space-x-4 mb-2">
                  {[1,2,3].map(i => (
                    <img key={i} src={`https://i.pravatar.cc/100?img=${i+40}`} className="w-12 h-12 rounded-full border-4 border-white shadow-lg" />
                  ))}
                </div>
              </div>

              {activeRequests.length === 0 ? (
                <div className="py-32 text-center animate-entrance">
                   <div className="w-28 h-28 bg-slate-50 rounded-[3rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                     <UI_ICONS.Map className="w-12 h-12 text-slate-200" />
                   </div>
                   <p className="text-2xl font-black text-slate-400 mb-2">Registry Inactive</p>
                   <p className="text-slate-400 font-medium text-lg">Initialize a deployment from the Fleet Radar to start tracking.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {activeRequests.map((req, idx) => (
                    <div 
                      key={req.id} 
                      className="flex flex-col xl:flex-row xl:items-center justify-between p-10 rounded-[3rem] border border-slate-50 bg-slate-50/40 hover:bg-white hover:shadow-3xl hover:shadow-indigo-500/10 transition-all group animate-entrance"
                      style={{ animationDelay: `${idx * 150}ms` }}
                    >
                      <div className="flex gap-8 items-center">
                        <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all group-hover:scale-110 ${req.status === RequestStatus.ACCEPTED ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-slate-200 text-slate-500 shadow-slate-100'}`}>
                           <UI_ICONS.Truck className="w-10 h-10" />
                        </div>
                        <div>
                          <div className="flex items-center gap-4 mb-3">
                            <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border ${req.status === RequestStatus.ACCEPTED ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                              {req.status}
                            </span>
                            <span className="text-xs font-black font-mono text-slate-300 tracking-tighter uppercase">ID: {req.id}</span>
                          </div>
                          <h4 className="text-3xl font-black text-slate-900 mb-2 tracking-tight group-hover:text-indigo-600 transition-colors">{req.aidType}</h4>
                          <p className="text-lg text-slate-500 font-bold flex items-center gap-3">
                             <div className="p-1 bg-slate-100 rounded-lg"><UI_ICONS.Box className="w-4 h-4 text-indigo-400" /></div>
                             {req.quantity} <span className="text-slate-200">/</span> {req.destination}
                          </p>
                        </div>
                      </div>
                      <div className="mt-8 xl:mt-0">
                        {req.status === RequestStatus.ACCEPTED ? (
                          <button 
                            onClick={() => setTrackingRequest(req)}
                            className="w-full xl:w-auto flex items-center justify-center gap-4 px-12 py-6 bg-slate-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] hover:bg-indigo-600 transition-all shadow-2xl hover:shadow-indigo-500/30 active:scale-95 group-hover:-translate-x-2"
                          >
                            <UI_ICONS.Map className="w-5 h-5" />
                            Live Telemetry
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-4 px-12 py-6 bg-slate-100 text-slate-400 rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] border border-slate-200 cursor-not-allowed">
                            Dispatch Pending
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Modern High-End Aid Form Modal */}
      {showForm && selectedTruck && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-3xl z-50 flex items-center justify-center p-8">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-[0_0_100px_rgba(79,70,229,0.2)] overflow-hidden animate-entrance duration-500">
            <div className="bg-slate-900 p-12 text-white relative">
              <button 
                onClick={() => setShowForm(false)}
                className="absolute top-10 right-10 text-white/30 hover:text-white transition-all text-4xl leading-none active:scale-90"
              >
                ✕
              </button>
              <div className="flex items-center gap-6 mb-8">
                 <div className="p-4 bg-indigo-600 rounded-[2rem] shadow-2xl shadow-indigo-500/50 rotate-3">
                   <UI_ICONS.Box className="w-10 h-10" />
                 </div>
                 <div>
                   <h3 className="text-5xl font-black tracking-tighter">Strategic Deployment</h3>
                   <p className="text-indigo-400 text-sm font-black uppercase tracking-[0.2em] mt-1">Confirmed Unit: {selectedTruck.name}</p>
                 </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmitAid} className="p-16 space-y-10">
              <div className="space-y-10">
                <div className="relative group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">AID Cargo Specification</label>
                  <input 
                    required
                    type="text" 
                    value={form.aidType}
                    onChange={e => setForm({...form, aidType: e.target.value})}
                    className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-600 outline-none transition-all font-black text-2xl text-slate-900 placeholder:text-slate-200"
                    placeholder="e.g., PHARMA CONVOY 01"
                  />
                </div>
                <div className="grid grid-cols-2 gap-10">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">Volume / Units</label>
                    <input 
                      required
                      type="text" 
                      value={form.quantity}
                      onChange={e => setForm({...form, quantity: e.target.value})}
                      className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-600 outline-none transition-all font-black text-2xl text-slate-900 placeholder:text-slate-200"
                      placeholder="500 KG"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">Mission Priority</label>
                    <div className="relative">
                      <select 
                        value={form.urgency}
                        onChange={e => setForm({...form, urgency: e.target.value as any})}
                        className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-600 outline-none transition-all font-black text-2xl text-slate-900 appearance-none cursor-pointer"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Standard</option>
                        <option value="High">Emergency</option>
                      </select>
                      <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-600">
                         <UI_ICONS.ChevronRight className="w-8 h-8 rotate-90" />
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">Destination Target</label>
                  <input 
                    required
                    type="text" 
                    value={form.destination}
                    onChange={e => setForm({...form, destination: e.target.value})}
                    className="w-full px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-600 outline-none transition-all font-black text-2xl text-slate-900 placeholder:text-slate-200"
                    placeholder="e.g., ADAMA REGIONAL HUB"
                  />
                </div>
              </div>

              <div className="pt-10">
                <button 
                  type="submit"
                  className="w-full py-8 bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.4em] text-xl hover:bg-indigo-700 transition-all shadow-3xl shadow-indigo-500/40 flex items-center justify-center gap-6 active:scale-95 group"
                >
                  Confirm Deployment
                  <UI_ICONS.ChevronRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scanning animation for the map */}
      <style>{`
        @keyframes scan {
          from { transform: translateY(-100%); }
          to { transform: translateY(400%); }
        }
      `}</style>
    </div>
  );
};
