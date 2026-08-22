import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import {
  fetchWishlistProductIds, addToWishlist, removeFromWishlist, fetchWishlistProducts,
} from '@/lib/api';
import type { Product } from '@/lib/types';

const LOCAL_KEY = 'iraq_queen_wishlist';

interface WishlistContextValue {
  ids: Set<string>;
  products: Product[];
  loading: boolean;
  toggle: (productId: string) => Promise<void>;
  has: (productId: string) => boolean;
  refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Load wishlist on mount / when auth state changes
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    if (session) {
      // Authenticated: load from DB
      fetchWishlistProductIds()
        .then((dbIds) => {
          if (!mounted) return;
          const dbSet = new Set(dbIds);
          // Merge localStorage items into DB
          const localIds = getLocalWishlist();
          const toSync = localIds.filter((id) => !dbSet.has(id));
          if (toSync.length > 0) {
            Promise.all(toSync.map((id) => addToWishlist(id)))
              .then(() => {
                clearLocalWishlist();
                fetchWishlistProductIds().then((all) => {
                  if (mounted) {
                    setIds(new Set(all));
                    setLoading(false);
                  }
                });
              })
              .catch(() => {
                setIds(dbSet);
                setLoading(false);
              });
          } else {
            setIds(dbSet);
            setLoading(false);
          }
        })
        .catch(() => mounted && setLoading(false));
    } else {
      // Guest: load from localStorage
      setIds(new Set(getLocalWishlist()));
      setLoading(false);
    }

    return () => { mounted = false; };
  }, [session]);

  const refresh = useCallback(async () => {
    if (session) {
      const dbIds = await fetchWishlistProductIds();
      setIds(new Set(dbIds));
      const prods = await fetchWishlistProducts();
      setProducts(prods);
    } else {
      setIds(new Set(getLocalWishlist()));
    }
  }, [session]);

  const toggle = useCallback(async (productId: string) => {
    if (session) {
      if (ids.has(productId)) {
        await removeFromWishlist(productId);
        setIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      } else {
        await addToWishlist(productId);
        setIds((prev) => new Set(prev).add(productId));
      }
    } else {
      // Guest: localStorage
      const local = getLocalWishlist();
      if (local.includes(productId)) {
        saveLocalWishlist(local.filter((id) => id !== productId));
        setIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      } else {
        saveLocalWishlist([...local, productId]);
        setIds((prev) => new Set(prev).add(productId));
      }
    }
  }, [session, ids]);

  const has = useCallback((productId: string) => ids.has(productId), [ids]);

  return (
    <WishlistContext.Provider value={{ ids, products, loading, toggle, has, refresh }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}

// --- Helpers ---

function getLocalWishlist(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalWishlist(ids: string[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(ids));
}

function clearLocalWishlist() {
  localStorage.removeItem(LOCAL_KEY);
}

// Lightweight session hook to avoid circular dependency with AuthContext
function useSession() {
  const [session, setSession] = useState<{ user: { id: string } } | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return { session };
}
