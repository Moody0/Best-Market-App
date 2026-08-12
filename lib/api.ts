import axios from 'axios';
import { useAuthStore } from '@/store/auth';

const API_URL = 'https://bestmarketsy.com/api'; 

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Platform': 'mobile',
  },
});

api.interceptors.request.use(async (config) => {
  try {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn('Error reading token', error);
  }
  return config;
});

export default api;
