import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useStoreSettings } from '@/lib/useStoreSettings';
import { formatIQD } from '@/lib/format';

interface CartPageProps {
  onNavigate: (to: string) => void;
}

export function CartPage({ onNavigate }: CartPageProps) {
  const { items, subtotal, setQty, remove, clear } = useCart();
  const { settings } = useStoreSettings();
  const deliveryFee = settings?.delivery_fee ?? 5000;
  const total = subtotal + (items.length > 0 ? deliveryFee : 0);

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-cream-100 flex items-center justify-center mb-4">
          <ShoppingBag size={36} className="text-charcoal-300" />
        </div>
        <h1 className="text-xl font-display font-bold text-charcoal-800 mb-2">سلة التسوق فارغة</h1>
        <p className="text-charcoal-500 text-sm mb-6">لم تقم بإضافة أي منتجات بعد</p>
        <button onClick={() => onNavigate('/products')} className="btn-primary">
          <ArrowLeft size={16} /> ابدأ التسوق
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-charcoal-900">سلة التسوق</h1>
        <button onClick={clear} className="text-sm text-rose-600 font-bold hover:underline">
          إفراغ السلة
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Items */}
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.product_id} className="card p-3 flex gap-3">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-cream-100 shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-charcoal-300">
                    <ShoppingBag size={20} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-charcoal-800 line-clamp-2">{item.name}</h3>
                <p className="text-rose-700 font-display font-bold text-sm mt-1">
                  {formatIQD(item.price)}
                </p>
                <p className="text-[11px] text-charcoal-400">المتوفر: {item.stock}</p>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center border border-charcoal-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setQty(item.product_id, item.quantity - 1)}
                      className="px-2 py-1.5 hover:bg-cream-100 transition"
                      aria-label="إنقاص"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="px-3 py-1.5 font-bold text-sm min-w-[2.5rem] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => setQty(item.product_id, item.quantity + 1)}
                      className="px-2 py-1.5 hover:bg-cream-100 transition disabled:opacity-30"
                      disabled={item.quantity >= item.stock}
                      aria-label="زيادة"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => remove(item.product_id)}
                    className="text-rose-500 hover:text-rose-700 p-1.5"
                    aria-label="حذف"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="text-left shrink-0">
                <p className="text-[11px] text-charcoal-400">المجموع</p>
                <p className="font-bold text-sm text-charcoal-800">
                  {formatIQD(item.price * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="card p-5 h-fit lg:sticky lg:top-20">
          <h2 className="font-bold text-charcoal-800 mb-4">ملخص الطلب</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-charcoal-500">المجموع الفرعي</span>
              <span className="font-bold">{formatIQD(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-500">رسوم التوصيل</span>
              <span className="font-bold">{formatIQD(deliveryFee)}</span>
            </div>
            <div className="border-t border-cream-200 pt-2 mt-2 flex justify-between items-baseline">
              <span className="font-bold text-charcoal-800">الإجمالي</span>
              <span className="font-display font-bold text-lg text-rose-700">{formatIQD(total)}</span>
            </div>
          </div>
          <button onClick={() => onNavigate('/checkout')} className="btn-primary w-full mt-5">
            إتمام الطلب
          </button>
          <button
            onClick={() => onNavigate('/products')}
            className="btn-ghost w-full mt-2 text-sm"
          >
            متابعة التسوق
          </button>
        </div>
      </div>
    </div>
  );
}
