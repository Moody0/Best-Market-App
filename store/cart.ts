import { create } from 'zustand';
import { Platform } from 'react-native';

import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

function createThrottledStorage(baseStorage: any, delay = 1000) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const pendingWrites = new Map<string, string>();
  return {
    getItem: baseStorage.getItem.bind(baseStorage),
    setItem: (key: string, value: string) => {
      pendingWrites.set(key, value);
      if (!timeout) {
        timeout = setTimeout(() => {
          pendingWrites.forEach((val, k) => {
            baseStorage.setItem(k, val);
          });
          pendingWrites.clear();
          timeout = null;
        }, delay);
      }
      return Promise.resolve();
    },
    removeItem: (key: string) => Promise.resolve(baseStorage.removeItem(key)),
  };
}

export interface CartItem {
  product_id: number;
  name: string;
  price: number;
  image_url: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  itemQuantities: Record<number, number>;
  appliedCoupon: string | null;
  discountAmount: number;
  isCartOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  loadCart: () => Promise<void>;
  toggleCart: (open: boolean) => void;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getDeliveryFee: () => number;
  getTotalPrice: () => number;
  getFinalTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      itemQuantities: {},
      appliedCoupon: null,
      discountAmount: 0,
      isCartOpen: false,

      toggleCart: (open: boolean) => set({ isCartOpen: open }),

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find((i) => i.product_id === item.product_id);
          let newItems;
          if (existing) {
        const cappedQuantity = Math.min(existing.quantity + item.quantity, 99);
        newItems = state.items.map((i) =>
          i.product_id === item.product_id ? { ...i, quantity: cappedQuantity } : i
        );
      } else {
        const cappedQuantity = Math.min(item.quantity, 99);
        newItems = [...state.items, { ...item, quantity: cappedQuantity }];
      }
      const newItemQuantities = newItems.reduce((acc, curr) => { acc[curr.product_id] = curr.quantity; return acc; }, {} as Record<number, number>);
      return { items: newItems, itemQuantities: newItemQuantities };
    });
  },

  removeItem: (productId) => {
    set((state) => {
      const newItems = state.items.filter((i) => i.product_id !== productId);
      const newItemQuantities = { ...state.itemQuantities };
      delete newItemQuantities[productId];
      return { items: newItems, itemQuantities: newItemQuantities };
    });
  },

  updateQuantity: (productId, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        const newItems = state.items.filter((i) => i.product_id !== productId);
        const newItemQuantities = { ...state.itemQuantities };
        delete newItemQuantities[productId];
        return { items: newItems, itemQuantities: newItemQuantities };
      }
      const cappedQuantity = Math.min(quantity, 99);
      const newItems = state.items.map((i) =>
        i.product_id === productId ? { ...i, quantity: cappedQuantity } : i
      );
      const newItemQuantities = { ...state.itemQuantities, [productId]: cappedQuantity };
      return { items: newItems, itemQuantities: newItemQuantities };
    });
  },

  clearCart: () => {
    set({ items: [], itemQuantities: {}, appliedCoupon: null, discountAmount: 0 });
  },

  loadCart: async () => {
  },

  applyCoupon: async (code) => {
    try {
      const { useAuthStore } = require('./auth');
      const token = useAuthStore.getState().token;
      
      if (!token) {
        return { 
          success: false, 
          message: 'يجب تسجيل الدخول أولاً لتتمكن من استخدام أكواد الخصم.' 
        };
      }

      const cleanCode = code.trim().toUpperCase();
      const subtotal = get().getSubtotal();
      
      const api = require('../lib/api').default;
      const res = await api.post('/coupons/apply', { 
        code: cleanCode,
        subtotal: subtotal
      });
      
      set({ appliedCoupon: cleanCode, discountAmount: res.data.discount_amount });
      return { success: true, message: 'تم تطبيق الخصم بنجاح!' };
    } catch (err: any) {
      set({ appliedCoupon: null, discountAmount: 0 });
      return { 
        success: false, 
        message: err.response?.data?.message || 'كود الخصم غير صالح أو منتهي الصلاحية' 
      };
    }
  },

  removeCoupon: () => {
    set({ appliedCoupon: null, discountAmount: 0 });
  },

  getSubtotal: () => {
    const { items } = get();
    return Math.round(items.reduce((total, item) => total + item.price * item.quantity, 0) * 100) / 100;
  },

  getDiscountAmount: () => {
    return get().discountAmount;
  },

  getDeliveryFee: () => {
    const { getSubtotal } = get();
    const subtotal = getSubtotal();
    if (subtotal === 0) return 0;
    return 0;
  },

  getTotalPrice: () => {
    const { getSubtotal } = get();
    return getSubtotal();
  },

  getFinalTotal: () => {
    const { getSubtotal, getDiscountAmount, getDeliveryFee } = get();
    const subtotal = getSubtotal();
    const discount = getDiscountAmount();
    const delivery = getDeliveryFee();
    return Math.max(0, Math.round((subtotal - discount + delivery) * 100) / 100);
  },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => createThrottledStorage(AsyncStorage, 1000)),
    }
  )
);

