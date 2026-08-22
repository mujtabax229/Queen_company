import { useEffect, useState } from 'react';
import { BarChart3, Loader2, Trophy, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatIQD } from '@/lib/format';

interface MandoubStats {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  telegram_link: string | null;
  order_count: number;
  total_value: number;
}

export function AdminPerformance() {
  const [stats, setStats] = useState<MandoubStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Fetch all mandoub profiles
        const { data: profiles } = await supabase
          .from('mandoub_profiles')
          .select('user_id, full_name, photo_url, telegram_link')
          .eq('onboarding_complete', true)
          .order('full_name', { ascending: true });

        if (!profiles || profiles.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch order counts and totals per mandoub
        const { data: orders } = await supabase
          .from('orders')
          .select('referred_by_mandoub_id, total, status')
          .not('referred_by_mandoub_id', 'is', null);

        const orderMap: Record<string, { count: number; value: number }> = {};
        for (const o of orders || []) {
          const mid = o.referred_by_mandoub_id as string;
          if (!orderMap[mid]) orderMap[mid] = { count: 0, value: 0 };
          orderMap[mid].count += 1;
          if (o.status !== 'cancelled') {
            orderMap[mid].value += o.total || 0;
          }
        }

        const result: MandoubStats[] = (profiles as any[]).map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          photo_url: p.photo_url,
          telegram_link: p.telegram_link,
          order_count: orderMap[p.user_id]?.count || 0,
          total_value: orderMap[p.user_id]?.value || 0,
        }));

        // Sort by order count descending
        result.sort((a, b) => b.order_count - a.order_count);
        setStats(result);
      } catch {
        // ignore
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-charcoal-300" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-charcoal-900 mb-2">
        تقرير أداء المندوبين
      </h1>
      <p className="text-sm text-charcoal-400 mb-5">عدد الطلبات والقيمة الإجمالية لكل مندوب</p>

      {stats.length === 0 ? (
        <div className="card p-10 text-center">
          <BarChart3 size={32} className="mx-auto text-charcoal-300 mb-2" />
          <p className="text-charcoal-400">لا توجد بيانات بعد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {stats.map((s, idx) => (
            <div key={s.user_id} className="card p-4 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                idx === 0 ? 'bg-gold-100 text-gold-700' : 'bg-cream-100 text-charcoal-400'
              }`}>
                {idx + 1}
              </div>
              <div className="w-10 h-10 rounded-full bg-cream-200 overflow-hidden flex items-center justify-center shrink-0">
                {s.photo_url ? (
                  <img src={s.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-charcoal-300 text-xs font-bold">
                    {s.full_name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-charcoal-800 truncate">{s.full_name}</p>
                <div className="flex items-center gap-3 text-xs text-charcoal-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <TrendingUp size={12} /> {s.order_count} طلب
                  </span>
                  <span className="font-bold text-rose-700">{formatIQD(s.total_value)}</span>
                </div>
              </div>
              {idx === 0 && s.order_count > 0 && (
                <Trophy size={18} className="text-gold-500 shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
