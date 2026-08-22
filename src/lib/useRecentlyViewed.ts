import { useCallback } from 'react';

const KEY = 'iraq_queen_recently_viewed';
const MAX = 8;

export function getRecentlyViewed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecentlyViewed(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX)));
}

export function useRecentlyViewed() {
  const addRecentlyViewed = useCallback((productId: string) => {
    const current = getRecentlyViewed();
    const filtered = current.filter((id) => id !== productId);
    saveRecentlyViewed([productId, ...filtered]);
  }, []);

  return { addRecentlyViewed, getRecentlyViewed };
}
