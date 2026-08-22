import { useState } from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import type { Product } from '@/lib/types';
import { formatIQD, discountPercent, primaryImage } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const { add } = useCart();
  const { show } = useToast();
  const [added, setAdded] = useState(false);

  const image = primaryImage(product);
  const discount = discountPercent(product.price, product.previous_price);
  const outOfStock = product.status === 'out_of_stock';

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (outOfStock) return;
    add(product, 1);
    setAdded(true);
    show('تم إضافة المنتج إلى السلة ✅', 'cart');
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div
      onClick={onClick}
      className="group card overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="relative aspect-square bg-cream-100 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-charcoal-300">
            <ShoppingBag size={40} />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-start">
          {discount && (
            <span className="badge bg-rose-600 text-white">-{discount}%</span>
          )}
          {product.is_new && (
            <span className="badge bg-gold-400 text-charcoal-900">جديد</span>
          )}
          {product.is_bestseller && (
            <span className="badge bg-charcoal-800 text-white">الأكثر مبيعاً</span>
          )}
        </div>

        {outOfStock && (
          <div className="absolute inset-0 bg-charcoal-900/40 flex items-center justify-center">
            <span className="badge bg-white text-charcoal-800 px-3 py-1 text-xs">نفذ المخزون</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="text-sm font-bold text-charcoal-800 line-clamp-2 leading-snug min-h-[2.5rem]">
          {product.name}
        </h3>
        {product.brand && (
          <p className="text-[11px] text-charcoal-400 mt-0.5">{product.brand}</p>
        )}
        <div className="flex items-baseline gap-2 mt-2 flex-wrap">
          <span className="text-rose-700 font-display font-bold text-base">
            {formatIQD(product.price)}
          </span>
          {product.previous_price && product.previous_price > product.price && (
            <span className="text-charcoal-400 line-through text-xs">
              {formatIQD(product.previous_price)}
            </span>
          )}
        </div>

        <button
          onClick={handleAdd}
          disabled={outOfStock}
          className={`w-full mt-3 text-xs py-2 rounded-lg font-bold transition-all ${
            outOfStock
              ? 'bg-cream-100 text-charcoal-300 cursor-not-allowed'
              : added
              ? 'bg-emerald-600 text-white'
              : 'bg-cream-100 text-charcoal-700 hover:bg-rose-600 hover:text-white active:scale-[0.98]'
          }`}
        >
          {outOfStock ? 'غير متوفر' : added ? <Check size={14} className="inline" /> : 'أضف إلى السلة'}
        </button>
      </div>
    </div>
  );
}
