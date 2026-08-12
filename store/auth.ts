import { create } from 'zustand';
import { Platform } from 'react-native';

let SecureStore: any = null;

const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    if (!SecureStore) SecureStore = require('expo-secure-store');
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    if (!SecureStore) SecureStore = require('expo-secure-store');
    return SecureStore.setItemAsync(key, value);
  },
  deleteItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    if (!SecureStore) SecureStore = require('expo-secure-store');
    return SecureStore.deleteItemAsync(key);
  },
};

export interface User {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  setAuth: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  restoreToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  setAuth: async (token: string, user: User) => {
    await storage.setItem('auth_token', token);
    await storage.setItem('user_data', JSON.stringify(user));
    set({ token, user });
  },

  logout: async () => {
    await storage.deleteItem('auth_token');
    await storage.deleteItem('user_data');
    set({ token: null, user: null });
  },

  restoreToken: async () => {
    try {
      const token = await storage.getItem('auth_token');
      const userStr = await storage.getItem('user_data');
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr), isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      set({ isLoading: false });
    }
  },
}));
