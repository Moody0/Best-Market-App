import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/lib/api';

interface Category {
  id: number;
  name: string;
  image_url?: string;
  image?: string;
  parsedImageString?: string;
  children?: Category[];
}

const parseImageString = (imageStr?: string) => {
  if (typeof imageStr === 'string' && imageStr.startsWith('[')) {
    try {
      const parsed = JSON.parse(imageStr);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch (e) {}
  }
  return imageStr;
};

interface CategoriesStore {
  categories: Category[];
  loading: boolean;
  error: boolean;
  lastFetched: number | null;
  fetchCategories: (force?: boolean) => Promise<void>;
}

export const useCategoriesStore = create<CategoriesStore>()(
  persist(
    (set, get) => ({
      categories: [],
      loading: false,
      error: false,
      lastFetched: null,

      fetchCategories: async (force = false) => {
        const state = get();
        if (!force && state.lastFetched && Date.now() - state.lastFetched < 5 * 60 * 1000 && state.categories.length > 0) {
          return;
        }

        if (state.categories.length === 0) {
          set({ loading: true, error: false });
        }
        
        try {
          const res = await api.get('/categories');
          const data = res.data.data || res.data;
          const parsedData = data.map((item: any) => {
            const imageString = parseImageString(item.image || item.image_url);

            let parsedChildren = item.children || [];
            parsedChildren = parsedChildren.map((child: any) => {
              const childImageString = parseImageString(child.image || child.image_url);
              return { ...child, parsedImageString: childImageString };
            });

            return { ...item, parsedImageString: imageString, children: parsedChildren };
          });
          set({ categories: parsedData, loading: false, lastFetched: Date.now(), error: false });
        } catch (error) {
          console.error('Error fetching categories:', error);
          if (state.categories.length === 0) {
            set({ error: true, loading: false });
          }
        }
      },
    }),
    {
      name: 'categories-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
