import { useEffect, useState } from 'react';
import { Check, Loader2, ShoppingBag, Camera, Home } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useStoreSettings } from '@/lib/useStoreSettings';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { createOrder, fetchActiveMandoubs } from '@/lib/api';
import { formatIQD, governorates } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { PhoneInput, validateLocalPhone, extractLocalPhone, formatPhoneDisplay } from '@/components/PhoneInput';
import type { Order, OrderItem } from '@/lib/types';

interface CheckoutPageProps {
  onNavigate: (to: string) => void;
}

export function CheckoutPage({ onNavigate }: CheckoutPageProps) {
  const { items, subtotal, clear } = useCart();
  const { settings } = useStoreSettings();
  const { session } = useAuth();
  const { show } = useToast();

  const deliveryFee = settings?.delivery_fee ?? 5000;
  const total = subtotal + deliveryFee;

  const [mandoubs, setMandoubs] = useState<{ id: string; full_name: string }[]>([]);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    governorate: '',
    address: '',
    notes: '',
    referredBy: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [successItems, setSuccessItems] = useState<OrderItem[]>([]);
  const [successMandoubName, setSuccessMandoubName] = useState<string>('');

  useEffect(() => {
    fetchActiveMandoubs().then(setMandoubs).catch(() => {});
  }, []);

  useEffect(() => {
    if (items.length === 0 && !successOrder) {
      onNavigate('/cart');
    }
  }, [items.length, successOrder, onNavigate]);

  if (items.length === 0 && !successOrder) {
    return null;
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'الرجاء إدخال الاسم';
    const phoneErr = validateLocalPhone(extractLocalPhone(form.phone));
    if (phoneErr) e.phone = phoneErr;
    if (!form.governorate) e.governorate = 'الرجاء اختيار المحافظة';
    if (!form.address.trim()) e.address = 'الرجاء إدخال العنوان';
    if (!form.referredBy) e.referredBy = 'الرجاء اختيار المندوب';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const referredById = form.referredBy === 'direct' ? null : form.referredBy;
      const { order, error } = await createOrder({
        name: form.name.trim(),
        phone: form.phone,
        governorate: form.governorate,
        address: form.address.trim(),
        notes: form.notes.trim() || undefined,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        delivery_fee: deliveryFee,
        customer_id: session?.user?.id ?? null,
        referred_by_mandoub_id: referredById,
      });
      if (error || !order) {
        show(error || 'تعذر إنشاء الطلب', 'error');
        setSubmitting(false);
        return;
      }
      const { order: fullOrder } = await fetchOrderWithItems(order.id);
      const finalOrder = fullOrder || order;
      setSuccessOrder(finalOrder);
      setSuccessItems(finalOrder.order_items || []);

      // Find mandoub name
      if (referredById) {
        const m = mandoubs.find((mb) => mb.id === referredById);
        setSuccessMandoubName(m?.full_name || '');
      } else {
        setSuccessMandoubName('');
      }

      clear();
      show('تم إنشاء الطلب بنجاح', 'success');
    } catch (err) {
      show(err instanceof Error ? err.message : 'حدث خطأ غير متوقع', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Success / receipt screen
  if (successOrder) {
    return (
      <ReceiptScreen
        order={successOrder}
        items={successItems}
        mandoubName={successMandoubName}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-display font-bold text-charcoal-900 mb-6">إتمام الطلب</h1>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="card p-5 space-y-4">
          <h2 className="font-bold text-charcoal-800">معلومات التوصيل</h2>

          <div>
            <label className="label">الاسم الكامل *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="مثال: زينب أحمد"
            />
            {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">رقم الهاتف *</label>
              <PhoneInput
                value={form.phone}
                onChange={(full) => setForm({ ...form, phone: full })}
                error={errors.phone}
                placeholder="77XX XXX XXX"
              />
            </div>
            <div>
              <label className="label">المحافظة *</label>
              <select
                value={form.governorate}
                onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                className="input"
              >
                <option value="">اختر المحافظة</option>
                {governorates().map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              {errors.governorate && (
                <p className="text-xs text-rose-600 mt-1">{errors.governorate}</p>
              )}
            </div>
          </div>

          <div>
            <label className="label">العنوان التفصيلي *</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input min-h-[80px]"
              placeholder="المنطقة، الشارع، أقرب نقطة دالة..."
            />
            {errors.address && <p className="text-xs text-rose-600 mt-1">{errors.address}</p>}
          </div>

          {/* Referral mandoub dropdown */}
          <div>
            <label className="label">المندوب الراعي *</label>
            <select
              value={form.referredBy}
              onChange={(e) => setForm({ ...form, referredBy: e.target.value })}
              className="input"
            >
              <option value="">اختر اسم المندوب</option>
              {mandoubs.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
              <option value="direct">مباشر / بدون مندوب</option>
            </select>
            <p className="text-[11px] text-charcoal-400 mt-1">
              اختر اسم المندوب الذي أرسلك — هذا الطلب سيُسجَّل تحت رعايته
            </p>
            {errors.referredBy && <p className="text-xs text-rose-600 mt-1">{errors.referredBy}</p>}
          </div>

          <div>
            <label className="label">ملاحظات (اختياري)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input min-h-[60px]"
              placeholder="أي تفاصيل إضافية للطلب..."
            />
          </div>
        </div>

        {/* Summary */}
        <div className="card p-5 h-fit">
          <h2 className="font-bold text-charcoal-800 mb-4">ملخص الطلب</h2>
          <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
            {items.map((i) => (
              <div key={i.product_id} className="flex items-center gap-2 text-sm">
                <div className="w-10 h-10 rounded bg-cream-100 overflow-hidden shrink-0">
                  {i.image && <img src={i.image} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-bold">{i.name}</p>
                  <p className="text-[11px] text-charcoal-400">
                    {i.quantity} × {formatIQD(i.price)}
                  </p>
                </div>
                <span className="text-xs font-bold">{formatIQD(i.price * i.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-cream-200 pt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-charcoal-500">المجموع الفرعي</span>
              <span className="font-bold">{formatIQD(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-500">رسوم التوصيل</span>
              <span className="font-bold">{formatIQD(deliveryFee)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-cream-200">
              <span className="font-bold text-charcoal-800">الإجمالي</span>
              <span className="font-display font-bold text-lg text-rose-700">{formatIQD(total)}</span>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full mt-5">
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> جاري التأكيد...
              </>
            ) : (
              <>
                <ShoppingBag size={18} /> تأكيد الطلب
              </>
            )}
          </button>
          <p className="text-[11px] text-charcoal-400 text-center mt-3">
            الدفع عند الاستلام
          </p>
        </div>
      </form>
    </div>
  );
}

function ReceiptScreen({
  order,
  items,
  mandoubName,
  onNavigate,
}: {
  order: Order;
  items: OrderItem[];
  mandoubName: string;
  onNavigate: (to: string) => void;
}) {
  const orderDate = new Date(order.created_at).toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
          <Check size={32} className="text-emerald-600" />
        </div>
        <h1 className="text-xl font-display font-bold text-charcoal-900">تم استلام طلبك!</h1>
        <p className="text-sm text-charcoal-500 mt-1">احفظ هذه الصفحة أو ارسلها للمندوب</p>
      </div>

      {/* Receipt card — designed to be screenshot-friendly */}
      <div className="card p-6 border-2 border-cream-200">
        {/* Receipt header */}
        <div className="text-center border-b border-cream-200 pb-4 mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-display font-bold text-sm">
              IQ
            </div>
            <span className="font-display font-bold text-charcoal-900">Iraq Queen</span>
          </div>
          <p className="text-rose-700 font-display font-bold text-lg">{order.order_number}</p>
          <p className="text-xs text-charcoal-400">{orderDate}</p>
        </div>

        {/* Items */}
        <div className="space-y-3 mb-4">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg bg-cream-100 shrink-0 overflow-hidden flex items-center justify-center">
                {item.product_id ? (
                  <ItemImage productId={item.product_id} />
                ) : (
                  <ShoppingBag size={16} className="text-charcoal-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-charcoal-800">{item.product_name}</p>
                <p className="text-xs text-charcoal-400">
                  {item.quantity} × {formatIQD(item.unit_price)}
                </p>
              </div>
              <span className="text-sm font-bold text-charcoal-800 shrink-0">
                {formatIQD(item.unit_price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-cream-200 pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-charcoal-500">المجموع الفرعي</span>
            <span className="font-bold">{formatIQD(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-charcoal-500">رسوم التوصيل</span>
            <span className="font-bold">{formatIQD(order.delivery_fee)}</span>
          </div>
          <div className="flex justify-between items-baseline pt-2 border-t border-cream-200">
            <span className="font-bold text-charcoal-800">الإجمالي</span>
            <span className="font-display font-bold text-lg text-rose-700">
              {formatIQD(order.total)}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="border-t border-cream-200 pt-3 mt-3 space-y-1 text-xs text-charcoal-500">
          <div className="flex justify-between">
            <span>الاسم</span>
            <span className="font-bold text-charcoal-700">{order.name}</span>
          </div>
          <div className="flex justify-between">
            <span>الهاتف</span>
            <span className="font-bold text-charcoal-700" dir="ltr">{formatPhoneDisplay(order.phone)}</span>
          </div>
          <div className="flex justify-between">
            <span>المحافظة</span>
            <span className="font-bold text-charcoal-700">{order.governorate}</span>
          </div>
          <div className="flex justify-between">
            <span>المندوب</span>
            <span className="font-bold text-charcoal-700">{mandoubName || 'مباشر'}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-5">
        <button
          onClick={() => onNavigate('/')}
          className="btn-primary flex-1"
        >
          <Home size={18} /> العودة للرئيسية
        </button>
        <button
          onClick={() => onNavigate('/products')}
          className="btn-outline flex-1"
        >
          <ShoppingBag size={18} /> متابعة التسوق
        </button>
      </div>

      <p className="text-xs text-charcoal-400 text-center mt-4 flex items-center justify-center gap-1">
        <Camera size={14} /> يمكنك تصوير هذه الصفحة ومشاركتها
      </p>
    </div>
  );
}

function ItemImage({ productId }: { productId: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('product_images')
        .select('url')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true })
        .limit(1);
      if (data && data.length > 0) setUrl(data[0].url);
    })();
  }, [productId]);

  if (!url) return <ShoppingBag size={16} className="text-charcoal-300 mx-auto" />;
  return <img src={url} alt="" className="w-full h-full object-cover" />;
}

async function fetchOrderWithItems(orderId: string): Promise<{ order: Order | null }> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .maybeSingle();
  if (error) return { order: null };
  return { order: data as Order | null };
}
