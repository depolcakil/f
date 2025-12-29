
import React, { useState, useEffect, useCallback } from 'react';
import { User, Notification, UserRole } from './types';
import { LandingPage } from './views/LandingPage';
import { RegistrationPage } from './views/RegistrationPage';
import { LoginPage } from './views/LoginPage';
import { AdminDashboard } from './views/AdminDashboard';
import { DriverDashboard } from './views/DriverDashboard';
import { SenderDashboard } from './views/SenderDashboard';
import { NotificationCenter } from './components/NotificationCenter';
import * as api from './src/services/api';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'LANDING' | 'REGISTER' | 'LOGIN' | 'DASHBOARD' | 'MAP'>('LANDING');
  const [loginRole, setLoginRole] = useState<UserRole | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const { data } = await api.getNotifications(currentUser.id);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    loadNotifications();

    socket.on('newNotification', (newNotification) => {
      if (newNotification.userId === currentUser?.id) {
        setNotifications((prev) => [newNotification, ...prev]);
      }
    });

    return () => {
      socket.off('newNotification');
    };
  }, [loadNotifications, currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('profile');
    setCurrentUser(null);
    setView('LANDING');
    setLoginRole(null);
  };

  const renderView = () => {
    switch (view) {
      case 'LANDING':
        return <LandingPage 
          onStartRegister={() => setView('REGISTER')} 
          onStartLogin={(role) => {
            setLoginRole(role);
            setView('LOGIN');
          }} 
        />;
      case 'REGISTER':
        return <RegistrationPage
          onBack={() => setView('LANDING')}
          onComplete={() => setView('LOGIN')}
        />;
      case 'LOGIN':
        return <LoginPage 
          role={loginRole!} 
          onBack={() => setView('LANDING')} 
          onSuccess={(user) => {
            setCurrentUser(user);
            setView('DASHBOARD');
          }} 
        />;
      case 'DASHBOARD':
        if (!currentUser) return null;
        if (currentUser.role === 'ADMIN') return <AdminDashboard user={currentUser} onLogout={handleLogout} />;
        if (currentUser.role === 'DRIVER') return <DriverDashboard user={currentUser} onLogout={handleLogout} refreshNotifications={loadNotifications} />;
        if (currentUser.role === 'SENDER') return <SenderDashboard user={currentUser} onLogout={handleLogout} />;
        return null;
      default:
        return <LandingPage onStartRegister={() => setView('REGISTER')} onStartLogin={(role) => {
          setLoginRole(role);
          setView('LOGIN');
        }} />;
    }
  };

  return (
    <div className="min-h-screen">
      {renderView()}
      {currentUser && (
        <NotificationCenter 
          notifications={notifications} 
          onClear={async (id) => {
            try {
              await api.markAsRead(id);
              loadNotifications();
            } catch (error) {
              console.error('Failed to mark notification as read:', error);
            }
          }}
        />
      )}
    </div>
  );
};

export default App;
