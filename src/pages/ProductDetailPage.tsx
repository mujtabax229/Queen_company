import { useEffect, useState } from 'react';
import { ShoppingBag, Check, Minus, Plus, ArrowRight, ZoomIn } from 'lucide-react';
import type { Product } from '@/lib/types';
import { fetchProductById } from '@/lib/api';
import { formatIQD, discountPercent } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';

interface ProductDetailPageProps {
  productId: string;
  onNavigate: (to: string) => void;
}

export function ProductDetailPage({ productId, onNavigate }: ProductDetailPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState(false);
  const { add } = useCart();
  const { show } = useToast();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setActiveImage(0);
    setQty(1);
    fetchProductById(productId)
      .then((p) => {
        if (!mounted) return;
        setProduct(p);
        setLoading(false);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'تعذر تحميل المنتج');
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [productId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-cream-100 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-cream-100 rounded w-3/4" />
            <div className="h-6 bg-cream-100 rounded w-1/3" />
            <div className="h-24 bg-cream-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-rose-600 font-bold">{error || 'المنتج غير موجود'}</p>
        <button onClick={() => onNavigate('/products')} className="btn-outline mt-4">
          العودة للمنتجات
        </button>
      </div>
    );
  }

  const images = product.product_images?.slice().sort((a, b) => a.sort_order - b.sort_order) || [];
  const current = images[activeImage];
  const discount = discountPercent(product.price, product.previous_price);
  const outOfStock = product.status === 'out_of_stock';
  const maxQty = product.stock_qty;

  const handleAdd = () => {
    if (outOfStock) return;
    add(product, qty);
    show('تم إضافة المنتج إلى السلة ✅', 'cart');
  };

  const handleBuyNow = () => {
    if (outOfStock) return;
    add(product, qty);
    onNavigate('/checkout');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <button
        onClick={() => onNavigate('/products')}
        className="flex items-center gap-1 text-sm text-charcoal-500 hover:text-rose-600 mb-4"
      >
        <ArrowRight size={16} /> العودة للمنتجات
      </button>

      <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
        {/* Gallery */}
        <div>
          <div
            className="relative aspect-square rounded-2xl overflow-hidden bg-cream-100 border border-cream-200 cursor-zoom-in"
            onClick={() => images.length > 0 && setZoom(true)}
          >
            {current ? (
              <img src={current.url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-charcoal-300">
                <ShoppingBag size={48} />
              </div>
            )}
            <div className="absolute top-3 right-3 flex flex-col gap-1 items-start">
              {discount && <span className="badge bg-rose-600 text-white">-{discount}%</span>}
              {product.is_new && <span className="badge bg-gold-400 text-charcoal-900">جديد</span>}
              {product.is_bestseller && (
                <span className="badge bg-charcoal-800 text-white">الأكثر مبيعاً</span>
              )}
            </div>
            {images.length > 0 && (
              <div className="absolute bottom-3 left-3 bg-white/80 rounded-full p-1.5">
                <ZoomIn size={16} className="text-charcoal-600" />
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                    i === activeImage ? 'border-rose-500' : 'border-cream-200 hover:border-rose-300'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.brand && (
            <p className="text-sm text-gold-600 font-bold mb-1">{product.brand}</p>
          )}
          <h1 className="text-2xl md:text-3xl font-display font-bold text-charcoal-900 leading-tight">
            {product.name}
          </h1>

          <div className="flex items-baseline gap-3 mt-4 flex-wrap">
            <span className="text-2xl font-display font-bold text-rose-700">
              {formatIQD(product.price)}
            </span>
            {product.previous_price && product.previous_price > product.price && (
              <>
                <span className="text-charcoal-400 line-through text-lg">
                  {formatIQD(product.previous_price)}
                </span>
                <span className="badge bg-rose-100 text-rose-700">
                  وفّر {formatIQD(product.previous_price - product.price)}
                </span>
              </>
            )}
          </div>

          <div className="mt-4">
            {outOfStock ? (
              <span className="inline-flex items-center gap-2 text-rose-600 font-bold text-sm">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> نفذ المخزون
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> متوفر ({product.stock_qty} قطعة)
              </span>
            )}
          </div>

          {product.description && (
            <div className="mt-5">
              <h3 className="font-bold text-charcoal-800 mb-2">الوصف</h3>
              <p className="text-charcoal-600 text-sm leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {product.category && (
            <div className="mt-4 text-sm text-charcoal-500">
              الفئة:{' '}
              <button
                onClick={() => onNavigate(`/products?category=${product.category!.id}`)}
                className="text-rose-600 font-bold hover:underline"
              >
                {product.category.name}
              </button>
            </div>
          )}

          {/* Quantity + actions */}
          {!outOfStock && (
            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center border border-charcoal-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3 py-2.5 hover:bg-cream-100 transition"
                  aria-label="إنقاص"
                >
                  <Minus size={16} />
                </button>
                <span className="px-4 py-2.5 font-bold min-w-[3rem] text-center">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  className="px-3 py-2.5 hover:bg-cream-100 transition"
                  aria-label="زيادة"
                >
                  <Plus size={16} />
                </button>
              </div>
              {qty >= maxQty && (
                <span className="text-xs text-charcoal-400">الحد الأقصى المتوفر</span>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleAdd}
              disabled={outOfStock}
              className="btn-outline flex-1"
            >
              <ShoppingBag size={18} /> أضف إلى السلة
            </button>
            <button
              onClick={handleBuyNow}
              disabled={outOfStock}
              className="btn-primary flex-1"
            >
              <Check size={18} /> اشترِ الآن
            </button>
          </div>
        </div>
      </div>

      {/* Zoom modal */}
      {zoom && current && (
        <div
          className="fixed inset-0 z-[80] bg-charcoal-900/90 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setZoom(false)}
        >
          <img
            src={current.url.replace('h=800&w=800', 'h=1400&w=1400')}
            alt={product.name}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
