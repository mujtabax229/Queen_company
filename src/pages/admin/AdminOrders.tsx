import { useEffect, useState } from 'react';
import { Search, X, MessageCircle, ChevronLeft, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/lib/types';
import { formatIQD } from '@/lib/format';
import { buildWhatsAppUrl, buildOrderMessage } from '@/lib/whatsapp';
import { useStoreSettings } from '@/lib/useStoreSettings';
import { useToast } from '@/context/ToastContext';
import { confirm } from '@/components/ConfirmHost';
import { useNotifications } from '@/context/NotificationContext';
import { formatPhoneDisplay } from '@/components/PhoneInput';

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'جديد',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

const STATUS_FLOW: OrderStatus[] = ['new', 'processing', 'shipped', 'completed', 'cancelled'];

const STATUS_COLORS: Record<OrderStatus, string> = {
  new: 'bg-rose-100 text-rose-700',
  processing: 'bg-gold-100 text-gold-700',
  shipped: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-charcoal-100 text-charcoal-600',
};

export function AdminOrders() {
  const { show } = useToast();
  const { settings } = useStoreSettings();
  const { isOrderUnread, markOrderRead } = useNotifications();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Order | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    if (search) {
      q = q.or(`order_number.ilike.%${search}%,name.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    const { data, error } = await q;
    if (error) {
      show('تعذر تحميل الطلبات', 'error');
    } else {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  const handleSelectOrder = (order: Order) => {
    setSelected(order);
    if (isOrderUnread(order.id)) {
      markOrderRead(order.id);
    }
  };

  const updateStatus = async (order: Order, status: OrderStatus) => {
    if (status === 'cancelled') {
      const ok = await confirm({
        title: 'إلغاء الطلب',
        message: `هل تريد إلغاء الطلب ${order.order_number}؟`,
        danger: true,
        confirmText: 'إلغاء الطلب',
      });
      if (!ok) return;
    }
    const { error } = await supabase.from('orders').update({ status }).eq('id', order.id);
    if (error) {
      show('تعذر تحديث الحالة', 'error');
    } else {
      show('تم تحديث الحالة', 'success');
      if (selected?.id === order.id) {
        setSelected({ ...order, status });
      }
      load();
    }
  };

  const sendWhatsApp = (order: Order) => {
    if (!settings?.whatsapp_number) {
      show('رقم واتساب غير مضبوط في الإعدادات', 'error');
      return;
    }
    const fullOrder = orders.find((o) => o.id === order.id) || order;
    window.open(buildWhatsAppUrl(settings.whatsapp_number, buildOrderMessage(fullOrder)), '_blank');
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-charcoal-900 mb-5">الطلبات</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث برقم الطلب، الاسم، أو الهاتف..."
            className="input pr-9 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-auto text-sm"
        >
          <option value="all">كل الحالات</option>
          {STATUS_FLOW.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-10 text-center">
          <Package size={32} className="mx-auto text-charcoal-300 mb-2" />
          <p className="text-charcoal-400">لا توجد طلبات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <button
              key={o.id}
              onClick={() => handleSelectOrder(o)}
              className={`card p-3 w-full flex items-center justify-between gap-3 text-right hover:shadow-md transition ${
                isOrderUnread(o.id) ? 'ring-2 ring-rose-300 ring-offset-1' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {isOrderUnread(o.id) && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  )}
                  <span className="font-bold text-sm text-charcoal-800">{o.order_number}</span>
                  <span className={`badge ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                </div>
                <div className="text-xs text-charcoal-400 mt-0.5 truncate">
                  {o.name} • {o.phone} • {o.governorate}
                </div>
                <div className="text-xs text-charcoal-400">
                  {o.item_count} منتج • {new Date(o.created_at).toLocaleDateString('ar')}
                </div>
              </div>
              <div className="text-left shrink-0">
                <div className="font-bold text-sm text-rose-700">{formatIQD(o.total)}</div>
                <ChevronLeft size={16} className="text-charcoal-300" />
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <OrderDetail
          order={orders.find((o) => o.id === selected.id) || selected}
          onClose={() => setSelected(null)}
          onUpdateStatus={updateStatus}
          onWhatsApp={sendWhatsApp}
        />
      )}
    </div>
  );
}

function OrderDetail({
  order,
  onClose,
  onUpdateStatus,
  onWhatsApp,
}: {
  order: Order;
  onClose: () => void;
  onUpdateStatus: (o: Order, s: OrderStatus) => void;
  onWhatsApp: (o: Order) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-charcoal-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-lg my-8 p-6 animate-scaleIn">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-display font-bold">{order.order_number}</h2>
            <p className="text-xs text-charcoal-400">
              {new Date(order.created_at).toLocaleString('ar')}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-2">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 mb-5">
          <DetailRow label="الاسم" value={order.name} />
          <DetailRow label="الهاتف" value={formatPhoneDisplay(order.phone)} />
          <DetailRow label="المحافظة" value={order.governorate} />
          <DetailRow label="العنوان" value={order.address} />
          {order.notes && <DetailRow label="ملاحظات" value={order.notes} />}
        </div>

        <div className="border-t border-cream-200 pt-4 mb-4">
          <h3 className="font-bold text-sm mb-3">المنتجات</h3>
          <div className="space-y-2">
            {order.order_items?.map((it) => (
              <div key={it.id} className="flex justify-between text-sm">
                <span className="text-charcoal-700">
                  {it.product_name} ×{it.quantity}
                </span>
                <span className="font-bold">{formatIQD(it.unit_price * it.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-cream-200 mt-3 pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-charcoal-500">المجموع الفرعي</span>
              <span>{formatIQD(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-500">رسوم التوصيل</span>
              <span>{formatIQD(order.delivery_fee)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1">
              <span>الإجمالي</span>
              <span className="text-rose-700">{formatIQD(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-cream-200 pt-4">
          <label className="label">تحديث الحالة</label>
          <div className="flex flex-wrap gap-2">
            {STATUS_FLOW.map((s) => (
              <button
                key={s}
                onClick={() => onUpdateStatus(order, s)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                  order.status === s
                    ? 'bg-charcoal-800 text-white'
                    : 'bg-cream-100 text-charcoal-600 hover:bg-cream-200'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => onWhatsApp(order)} className="btn-whatsapp w-full mt-5">
          <MessageCircle size={18} /> إرسال عبر واتساب
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-charcoal-500 shrink-0">{label}:</span>
      <span className="font-bold text-charcoal-800">{value}</span>
    </div>
  );
}
