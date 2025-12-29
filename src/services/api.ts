
import axios from 'axios';
import { User, AidRequest, Notification } from '../types';

const API = axios.create({ baseURL: `${import.meta.env.VITE_API_URL}/api` });

API.interceptors.request.use((req) => {
  const profile = localStorage.getItem('profile');
  if (profile) {
    const parsedProfile = JSON.parse(profile);
    if (parsedProfile.token) {
      req.headers.Authorization = `Bearer ${parsedProfile.token}`;
    }
  }
  return req;
});

// Auth
export const register = (formData: any) => API.post('/auth/register', formData);
export const login = (formData: any) => API.post('/auth/login', formData);

// Users
export const getPendingDrivers = () => API.get('/users/drivers/pending');
export const approveDriver = (id: string) => API.patch(`/users/drivers/${id}/approve`);
export const updateDriverStatus = (status: { status: string }) => API.put('/users/driver/status', status);

// Aid Requests
export const createAidRequest = (formData: any) => API.post('/aid-requests', formData);
export const getAidRequests = () => API.get('/aid-requests');
export const acceptAidRequest = (id: string, driverId: string) => API.patch(`/aid-requests/${id}/accept`, { driverId });

// Notifications
export const getNotifications = (userId: string) => API.get(`/notifications/${userId}`);
export const markAsRead = (id: string) => API.patch(`/notifications/${id}/read`);
