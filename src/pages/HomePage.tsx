import { useEffect, useState } from 'react';
import { ArrowLeft, Sparkles, TrendingUp, Tag, Star } from 'lucide-react';
import type { Category, Product, StoreSettings } from '@/lib/types';
import { fetchCategories, fetchProducts } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';

interface HomePageProps {
  settings: StoreSettings | null;
  onNavigate: (to: string) => void;
}

export function HomePage({ settings, onNavigate }: HomePageProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [discounted, setDiscounted] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [cats, feat, nw, best, disc] = await Promise.all([
          fetchCategories(),
          fetchProducts({ featured: true, limit: 8 }),
          fetchProducts({ isNew: true, limit: 8 }),
          fetchProducts({ bestseller: true, limit: 8 }),
          fetchProducts({ discounted: true, limit: 8 }),
        ]);
        if (!mounted) return;
        setCategories(cats);
        setFeatured(feat);
        setNewProducts(nw);
        setBestsellers(best);
        setDiscounted(disc);
        setLoading(false);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'حدث خطأ أثناء تحميل المنتجات');
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const storeName = settings?.store_name_ar || settings?.store_name || 'شركة عراق كوين';

  if (loading) return <HomeSkeleton />;
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-rose-600 font-bold">{error}</p>
        <p className="text-charcoal-500 text-sm mt-2">يرجى إعادة تحميل الصفحة</p>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-bl from-cream-100 via-cream-50 to-rose-50 overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-rose-200/30 rounded-full blur-3xl -translate-x-20 -translate-y-20" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-gold-200/30 rounded-full blur-3xl translate-x-20 translate-y-20" />
        <div className="relative max-w-7xl mx-auto px-4 py-14 md:py-20 grid md:grid-cols-2 gap-8 items-center">
          <div className="text-center md:text-right">
            <span className="inline-flex items-center gap-1.5 badge bg-rose-100 text-rose-700 px-3 py-1 mb-4">
              <Sparkles size={14} /> متجر التجميل الأول في العراق
            </span>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-charcoal-900 leading-tight">
              {storeName}
            </h1>
            <p className="text-charcoal-600 mt-4 text-base md:text-lg leading-relaxed max-w-md mx-auto md:mx-0">
              عطور فاخرة، مكياج راقٍ، وعناية متكاملة بالبشرة والشعر. جودة عالية وأسعار مناسبة،
              مع التوصيل لكل المحافظات والدفع عند الاستلام.
            </p>
            <div className="flex flex-wrap gap-3 mt-6 justify-center md:justify-start">
              <button onClick={() => onNavigate('/products')} className="btn-primary">
                تسوق الآن <ArrowLeft size={16} />
              </button>
              <button onClick={() => onNavigate('/products?filter=bestseller')} className="btn-outline">
                الأكثر مبيعاً
              </button>
            </div>
          </div>
          <div className="hidden md:block relative">
            <div className="aspect-square rounded-3xl overflow-hidden shadow-xl border-4 border-white">
              <img
                src="https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg?auto=compress&cs=tinysrgb&h=700&w=700"
                alt="منتجات التجميل"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-lg p-4 border border-cream-200">
              <div className="text-rose-600 font-display font-bold text-2xl">+500</div>
              <div className="text-xs text-charcoal-500">منتج متنوع</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-10">
          <SectionHeader title="تسوق حسب الفئة" onMore={() => onNavigate('/products')} />
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => onNavigate(`/products?category=${c.id}`)}
                className="group flex flex-col items-center gap-2"
              >
                <div className="w-full aspect-square rounded-2xl overflow-hidden bg-cream-100 border border-cream-200 group-hover:border-rose-300 transition">
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt={c.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-charcoal-300">
                      <Tag size={28} />
                    </div>
                  )}
                </div>
                <span className="text-xs md:text-sm font-bold text-charcoal-700 group-hover:text-rose-700 transition text-center">
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {discounted.length > 0 && (
        <Section
          title="عروض وخصومات"
          icon={<Tag size={18} className="text-rose-600" />}
          products={discounted}
          onNavigate={onNavigate}
          moreTo="/products?filter=discounted"
        />
      )}

      {featured.length > 0 && (
        <Section
          title="منتجات مميزة"
          icon={<Star size={18} className="text-gold-500" />}
          products={featured}
          onNavigate={onNavigate}
          moreTo="/products?filter=featured"
        />
      )}

      {newProducts.length > 0 && (
        <Section
          title="وصل حديثاً"
          icon={<Sparkles size={18} className="text-rose-500" />}
          products={newProducts}
          onNavigate={onNavigate}
          moreTo="/products?filter=new"
        />
      )}

      {bestsellers.length > 0 && (
        <Section
          title="الأكثر مبيعاً"
          icon={<TrendingUp size={18} className="text-emerald-600" />}
          products={bestsellers}
          onNavigate={onNavigate}
          moreTo="/products?filter=bestseller"
        />
      )}
    </div>
  );
}

function SectionHeader({ title, onMore }: { title: string; onMore: () => void }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-xl md:text-2xl font-display font-bold text-charcoal-900">{title}</h2>
      <button onClick={onMore} className="text-sm font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1">
        عرض الكل <ArrowLeft size={16} />
      </button>
    </div>
  );
}

function Section({
  title,
  icon,
  products,
  onNavigate,
  moreTo,
}: {
  title: string;
  icon: React.ReactNode;
  products: Product[];
  onNavigate: (to: string) => void;
  moreTo: string;
}) {
  if (products.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl md:text-2xl font-display font-bold text-charcoal-900 flex items-center gap-2">
          {icon} {title}
        </h2>
        <button
          onClick={() => onNavigate(moreTo)}
          className="text-sm font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
        >
          عرض الكل <ArrowLeft size={16} />
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onClick={() => onNavigate(`/product/${p.id}`)} />
        ))}
      </div>
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="animate-pulse space-y-6">
        <div className="h-64 bg-cream-100 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 bg-cream-100 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
