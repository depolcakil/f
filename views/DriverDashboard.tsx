
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import io, { Socket } from 'socket.io-client';
import { User, TruckStatus, AidRequest, RequestStatus } from '../types';
import * as api from '../src/services/api';
import { ICONS as UI_ICONS, APP_NAME } from '../constants';
import { Footer } from '../components/Footer';

// Leaflet icon fix
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// --- REFACTORED LOCATION TRACKER ---
interface LocationTrackerProps {
  userId: string;
  aidRequestId: string;
  socket: Socket | null;
}

const LocationTracker: React.FC<LocationTrackerProps> = ({ userId, aidRequestId, socket }) => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateLocation = useCallback((lat: number, lng: number) => {
    if (socket) {
      socket.emit('driver:locationUpdate', {
        driverId: userId,
        aidRequestId,
        location: { lat, lng },
      });
    }
  }, [socket, userId, aidRequestId]);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
        updateLocation(latitude, longitude);
        setError(null);
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [updateLocation]);

  if (error) {
    return <div className="text-red-500 bg-red-100 p-4 rounded-lg text-center font-bold">GPS Error: {error}</div>;
  }

  if (!position) {
    return <div className="text-slate-400 bg-slate-800 p-4 rounded-lg text-center font-medium">Acquiring GPS signal...</div>;
  }

  return (
    <MapContainer center={position} zoom={13} style={{ height: '400px', width: '100%', borderRadius: '1.5rem' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={position}>
        <Popup>Your current location.</Popup>
      </Marker>
    </MapContainer>
  );
};

// --- REFACTORED DRIVER DASHBOARD ---
interface DriverDashboardProps {
  user: User;
  onLogout: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ user, onLogout }) => {
  const [status, setStatus] = useState<TruckStatus>(user.truckDetails?.currentStatus || TruckStatus.IDLE);
  const [activeRequest, setActiveRequest] = useState<AidRequest | null>(null);
  const [pendingRequests, setPendingRequests] = useState<AidRequest[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to the socket server
    socketRef.current = io('http://localhost:5000', {
      query: { token: localStorage.getItem('token') },
    });

    const fetchRequests = async () => {
      try {
        const { data: allRequests } = await api.getAidRequests();
        const pending = allRequests.filter(r => r.driverId === user.id && r.status === RequestStatus.PENDING);
        const active = allRequests.find(r => r.driverId === user.id && r.status === RequestStatus.ACCEPTED);

        setPendingRequests(pending);
        setActiveRequest(active || null);

        if (active) {
          setStatus(TruckStatus.BUSY);
          // Join the room for this specific aid request to send updates
          socketRef.current?.emit('joinAidRequestRoom', active.id);
        }
      } catch (error) {
        console.error("Failed to fetch requests:", error);
      }
    };

    fetchRequests();
    const interval = setInterval(fetchRequests, 10000); // Poll for new requests every 10 seconds

    return () => {
      clearInterval(interval);
      socketRef.current?.disconnect();
    };
  }, [user.id]);

  const handleToggleAvailability = async () => {
    const newStatus = status === TruckStatus.IDLE ? TruckStatus.READY : TruckStatus.IDLE;
    try {
      await api.updateDriverStatus({ status: newStatus });
      setStatus(newStatus);
    } catch (error) {
      console.error("Failed to update driver status:", error);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      // The backend assigns the driverId based on the authenticated user
      await api.updateAidRequestStatus(requestId, { status: RequestStatus.ACCEPTED, driverId: user.id });
      // Refetch requests to update the UI
      const { data: allRequests } = await api.getAidRequests();
      const active = allRequests.find(r => r.id === requestId);
      setActiveRequest(active || null);
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      setStatus(TruckStatus.BUSY);
      socketRef.current?.emit('joinAidRequestRoom', requestId);
    } catch (error) {
      console.error("Failed to accept request:", error);
    }
  };

  const handleReportMilestone = () => {
    if (!activeRequest || !socketRef.current) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      const milestone = {
        location: { lat: latitude, lng: longitude },
        timestamp: new Date().toISOString(),
        notes: `Checkpoint reached at ${new Date().toLocaleTimeString()}`,
      };
      socketRef.current?.emit('driver:milestone', {
        aidRequestId: activeRequest.id,
        milestone,
      });
      alert('Milestone reported to sender!');
    });
  };

  const handleMarkCompleted = async () => {
    if (!activeRequest) return;
    try {
      await api.completeAidRequest(activeRequest.id);
      setActiveRequest(null);
      setStatus(TruckStatus.READY); // Or IDLE, depending on desired flow
    } catch (error) {
      console.error("Failed to mark request as completed:", error);
    }
  };


  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass-panel border-b px-8 py-5 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
            <UI_ICONS.Truck className="w-6 h-6" />
          </div>
          <span className="font-black text-xl tracking-tighter text-slate-800">{APP_NAME} Driver</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-white border border-slate-200 px-5 py-2.5 rounded-2xl shadow-sm">
             <div className={`w-3 h-3 rounded-full ${status === TruckStatus.READY ? 'bg-green-500 animate-pulse' : status === TruckStatus.BUSY ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
             <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{status}</span>
          </div>
          <div className="h-8 w-px bg-slate-200 mx-2"></div>
          <button onClick={onLogout} className="text-slate-400 hover:text-red-600 transition-all p-2 rounded-lg hover:bg-red-50">
            <UI_ICONS.LogOut className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full p-8 md:p-12 flex-grow animate-fade-in">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-10">
            {/* Status Section */}
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-110"></div>
              <div className="relative z-10">
                <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Deployment Ready?</h2>
                <p className="text-slate-500 mb-10 max-w-md font-medium">Broadcast your availability to aid organizations. Your GPS will be tracked upon task acceptance.</p>
                
                <button 
                  onClick={handleToggleAvailability}
                  disabled={status === TruckStatus.BUSY}
                  className={`w-full py-7 rounded-[1.5rem] font-black text-xl transition-all shadow-xl flex items-center justify-center gap-4 ${
                    status === TruckStatus.READY 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 shadow-red-100' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-300 active:scale-95'
                  } disabled:opacity-50 disabled:grayscale`}
                >
                  {status === TruckStatus.READY ? 'Go Offline' : 'Set as Available'}
                  {status !== TruckStatus.READY && <UI_ICONS.ChevronRight className="w-6 h-6" />}
                </button>
              </div>
            </div>

            {/* Active Task Card */}
            {activeRequest ? (
              <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                  <UI_ICONS.Box className="w-64 h-64" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 text-blue-400">Current Mission</span>
                    <span className="text-white/30 text-xs font-mono">#{activeRequest.id}</span>
                  </div>
                  <h3 className="text-4xl font-black mb-2 tracking-tight">{activeRequest.aidType}</h3>
                  <p className="text-slate-400 text-xl mb-12 flex items-center gap-2">
                    <UI_ICONS.Map className="w-5 h-5 text-blue-500" />
                    Delivering to {activeRequest.destination}
                  </p>
                  <div className="mb-8">
                    <LocationTracker userId={user.id} aidRequestId={activeRequest.id} socket={socketRef.current} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <button onClick={handleReportMilestone} className="py-5 bg-white text-slate-900 rounded-2xl font-black hover:bg-blue-50 transition-all shadow-lg active:scale-95">Report Milestone</button>
                    <button onClick={handleMarkCompleted} className="py-5 bg-white/10 text-white rounded-2xl font-black hover:bg-white/20 transition-all border border-white/10 active:scale-95">Mark Completed</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-100/50 border-4 border-dashed border-slate-200 p-20 rounded-[2.5rem] text-center">
                <div className="w-20 h-20 bg-slate-200/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <UI_ICONS.Box className="w-10 h-10 text-slate-400" />
                </div>
                <p className="font-black text-slate-400 text-lg">No Active Shipments</p>
                <p className="text-slate-400 text-sm mt-1">Pending your availability status...</p>
              </div>
            )}
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-xl text-slate-900 tracking-tight flex items-center gap-3">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <UI_ICONS.Bell className="w-5 h-5 text-blue-600" />
                </div>
                Broadcasts
              </h3>
              <span className="px-3 py-1 bg-slate-200 text-slate-600 rounded-full text-[10px] font-black">{pendingRequests.length} New</span>
            </div>
            
            <div className="space-y-4">
              {pendingRequests.length === 0 ? (
                <div className="bg-white/50 p-8 rounded-3xl border border-slate-200 border-dashed text-center">
                  <p className="text-sm text-slate-400 font-medium">Listening for radio calls...</p>
                </div>
              ) : (
                pendingRequests.map((r, idx) => (
                  <div 
                    key={r.id} 
                    className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 group hover:border-blue-500 transition-all animate-fade-in"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${r.urgency === 'High' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                        {r.urgency} Priority
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(r.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <h4 className="font-black text-slate-900 text-lg mb-1">{r.aidType}</h4>
                    <p className="text-sm text-slate-500 mb-8 font-medium">{r.quantity} • To {r.destination}</p>
                    <button 
                      onClick={() => handleAcceptRequest(r.id)}
                      className="w-full py-4 bg-slate-900 text-white rounded-xl font-black hover:bg-blue-600 transition-all text-xs uppercase tracking-[0.2em] shadow-lg active:scale-95"
                    >
                      Accept Call
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2rem] text-white shadow-2xl shadow-blue-900/20">
               <h4 className="font-black text-lg mb-6 tracking-tight">Driver Scorecard</h4>
               <div className="grid grid-cols-2 gap-6">
                 <div>
                   <p className="text-[10px] text-blue-200 uppercase font-black tracking-widest mb-1">Delivered</p>
                   <p className="text-3xl font-black">24</p>
                 </div>
                 <div>
                   <p className="text-[10px] text-blue-200 uppercase font-black tracking-widest mb-1">Reliability</p>
                   <p className="text-3xl font-black text-teal-400">98%</p>
                 </div>
               </div>
               <div className="mt-8 pt-6 border-t border-white/10">
                 <button className="text-xs font-black text-blue-100 hover:text-white transition-colors flex items-center gap-2">
                   View Full History <UI_ICONS.ChevronRight className="w-4 h-4" />
                 </button>
               </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
