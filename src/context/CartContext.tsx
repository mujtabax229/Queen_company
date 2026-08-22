import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Product } from '@/lib/types';

interface CartEntry {
  product_id: string;
  name: string;
  price: number;
  image: string | null;
  stock: number;
  quantity: number;
}

interface CartState {
  items: CartEntry[];
  count: number;
  subtotal: number;
  add: (product: Product, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartState | undefined>(undefined);
const STORAGE_KEY = 'iraq_queen_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartEntry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartEntry[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const add: CartState['add'] = (product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      const max = product.stock_qty;
      if (existing) {
        const nextQty = Math.min(existing.quantity + qty, max);
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: nextQty } : i
        );
      }
      const image =
        product.product_images?.find((im) => im.is_primary)?.url ||
        product.product_images?.[0]?.url ||
        null;
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
          image,
          stock: max,
          quantity: Math.min(qty, max),
        },
      ];
    });
  };

  const remove: CartState['remove'] = (productId) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const setQty: CartState['setQty'] = (productId, qty) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.product_id === productId
            ? { ...i, quantity: Math.max(0, Math.min(qty, i.stock)) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const clear = () => setItems([]);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, count, subtotal, add, remove, setQty, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
