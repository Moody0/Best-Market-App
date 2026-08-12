import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';
import api from '@/lib/api';
import { normalizeImageUrl } from '@/lib/ImagePrefetchManager';

interface HomeStore {
  data: any | null;
  loading: boolean;
  error: boolean;
  lastFetched: number | null;
  fetchHomeData: (force?: boolean) => Promise<void>;
}

export const useHomeStore = create<HomeStore>()(
  persist(
    (set, get) => ({
      data: null,
      loading: false,
      error: false,
      lastFetched: null,

      fetchHomeData: async (force = false) => {
        const state = get();
        if (!force && state.lastFetched && Date.now() - state.lastFetched < 5 * 60 * 1000 && state.data) {
          return;
        }

        if (!state.data) {
          set({ loading: true, error: false });
        }
        
        try {
          const res = await api.get('/home');
          const homeData = res.data;
          
          if (homeData.banners && Array.isArray(homeData.banners)) {
            homeData.banners.forEach((b: any) => {
              if (b.image_url) {
                Image.prefetch(normalizeImageUrl(b.image_url));
              }
            });
          }

          set({ data: homeData, loading: false, lastFetched: Date.now(), error: false });
        } catch (error) {
          console.error('Error fetching home data:', error);
          if (!state.data) {
            set({ error: true, loading: false });
          }
        }
      },
    }),
    {
      name: 'home-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
