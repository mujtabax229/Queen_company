import { useEffect, useState } from 'react';
import { Package, AlertCircle, ShoppingCart, TrendingUp, Clock } from 'lucide-react';
import { fetchDashboardStats } from '@/lib/api';
import { formatIQD } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import type { Order } from '@/lib/types';

interface AdminDashboardProps {
  onNavigate: (to: string) => void;
}

type Range = 'today' | '7d' | '30d' | 'all';

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { isAdmin } = useAuth();
  const [range, setRange] = useState<Range>('30d');
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchDashboardStats>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchDashboardStats(range)
      .then((s) => mounted && setStats(s))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [range]);

  const statusLabel = (s: Order['status']) =>
    ({
      new: 'جديد',
      processing: 'قيد التجهيز',
      shipped: 'تم الشحن',
      completed: 'مكتمل',
      cancelled: 'ملغي',
    }[s]);

  const statusColor = (s: Order['status']) =>
    ({
      new: 'bg-rose-100 text-rose-700',
      processing: 'bg-gold-100 text-gold-700',
      shipped: 'bg-blue-100 text-blue-700',
      completed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-charcoal-100 text-charcoal-600',
    }[s]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold text-charcoal-900">نظرة عامة</h1>
        <div className="flex gap-1 bg-white rounded-lg p-1 border border-cream-200">
          {(['today', '7d', '30d', 'all'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                range === r ? 'bg-charcoal-800 text-white' : 'text-charcoal-500 hover:bg-cream-100'
              }`}
            >
              {r === 'today' ? 'اليوم' : r === '7d' ? '٧ أيام' : r === '30d' ? '٣٠ يوم' : 'الكل'}
            </button>
          ))}
        </div>
      </div>

      {loading || !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard
              icon={<Package size={20} />}
              label="إجمالي المنتجات"
              value={String(stats.totalProducts)}
              color="bg-blue-50 text-blue-600"
            />
            <StatCard
              icon={<Package size={20} />}
              label="متوفر"
              value={String(stats.available)}
              sub={`نفذ: ${stats.outOfStock}`}
              color="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              icon={<ShoppingCart size={20} />}
              label="إجمالي الطلبات"
              value={String(stats.totalOrders)}
              sub={`جديد: ${stats.newOrders}`}
              color="bg-rose-50 text-rose-600"
            />
            <StatCard
              icon={<TrendingUp size={20} />}
              label="إجمالي المبيعات"
              value={formatIQD(stats.totalSales)}
              color="bg-gold-50 text-gold-700"
            />
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-charcoal-800 flex items-center gap-2">
                <Clock size={18} /> أحدث الطلبات
              </h2>
              <button
                onClick={() => onNavigate('/admin/orders')}
                className="text-sm font-bold text-rose-600 hover:underline"
              >
                عرض الكل
              </button>
            </div>

            {stats.recent.length === 0 ? (
              <p className="text-center text-charcoal-400 text-sm py-8">لا توجد طلبات في هذه الفترة</p>
            ) : (
              <div className="space-y-2">
                {stats.recent.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => onNavigate('/admin/orders')}
                    className="w-full flex items-center justify-between gap-2 p-3 rounded-lg hover:bg-cream-50 transition text-right"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-charcoal-800">{o.order_number}</div>
                      <div className="text-xs text-charcoal-400 truncate">
                        {o.name} • {o.item_count} منتج
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-sm text-rose-700">{formatIQD(o.total)}</span>
                      <span className={`badge ${statusColor(o.status)}`}>{statusLabel(o.status)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {stats.outOfStock > 0 && isAdmin && (
            <div className="card p-4 mt-4 border-gold-200 bg-gold-50/50 flex items-center gap-3">
              <AlertCircle size={20} className="text-gold-600 shrink-0" />
              <p className="text-sm text-charcoal-700">
                يوجد {stats.outOfStock} منتج نفذ منه المخزون.{' '}
                <button onClick={() => onNavigate('/admin/products')} className="font-bold text-rose-600 hover:underline">
                  مراجعة المنتجات
                </button>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="card p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        {icon}
      </div>
      <div className="text-xs text-charcoal-500 font-bold">{label}</div>
      <div className="text-xl font-display font-bold text-charcoal-900 mt-0.5">{value}</div>
      {sub && <div className="text-[11px] text-charcoal-400 mt-0.5">{sub}</div>}
    </div>
  );
}
