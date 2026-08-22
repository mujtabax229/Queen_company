import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { StoreSettings } from '@/lib/types';

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase
      .from('store_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        setSettings(data as StoreSettings);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { settings, loading, setSettings };
}
