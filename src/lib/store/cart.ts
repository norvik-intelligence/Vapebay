'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  qty: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  /** Set once the visitor passes the age gate; gates checkout. */
  ageVerified: boolean;
  add: (productId: string, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  setAgeVerified: (value: boolean) => void;
  count: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      ageVerified: false,

      add: (productId, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === productId);
          const items = existing
            ? state.items.map((i) =>
                i.productId === productId ? { ...i, qty: Math.min(i.qty + qty, 99) } : i,
              )
            : [...state.items, { productId, qty }];
          // Opening the drawer on add is the single highest-leverage AOV moment:
          // it is where the bundle progress becomes visible.
          return { items, isOpen: true };
        }),

      remove: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

      setQty: (productId, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, qty: Math.min(qty, 99) } : i,
                ),
        })),

      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      setAgeVerified: (value) => set({ ageVerified: value }),

      count: () => get().items.reduce((sum, i) => sum + i.qty, 0),
    }),
    {
      name: 'vapebay-cart',
      storage: createJSONStorage(() => localStorage),
      // `isOpen` is session UI state — persisting it means the drawer flies open
      // on every cold page load.
      partialize: (state) => ({
        items: state.items,
        ageVerified: state.ageVerified,
      }),
    },
  ),
);
