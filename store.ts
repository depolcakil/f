
import { User, RegistrationStatus, TruckStatus, AidRequest, Notification } from './types';

const STORAGE_KEYS = {
  USERS: 'ethio_users',
  REQUESTS: 'ethio_requests',
  NOTIFICATIONS: 'ethio_notifications'
};

const INITIAL_ADMIN: User = {
  id: 'admin-1',
  name: 'Ethio Admin',
  email: 'admin@ethiosafeguard.com',
  role: 'ADMIN',
  status: RegistrationStatus.APPROVED
};

export const store = {
  getUsers: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    const users = data ? JSON.parse(data) : [INITIAL_ADMIN];
    return users;
  },
  saveUsers: (users: User[]) => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },
  getRequests: (): AidRequest[] => {
    const data = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    return data ? JSON.parse(data) : [];
  },
  saveRequests: (requests: AidRequest[]) => {
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
  },
  getNotifications: (): Notification[] => {
    const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return data ? JSON.parse(data) : [];
  },
  saveNotifications: (notifications: Notification[]) => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  },
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const all = store.getNotifications();
    const newNote: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      read: false
    };
    store.saveNotifications([newNote, ...all]);
  }
};
