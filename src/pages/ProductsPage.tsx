import { useEffect, useState, useMemo } from 'react';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import type { Category, Product } from '@/lib/types';
import { fetchCategories, fetchProducts, type ProductQuery } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { formatIQD } from '@/lib/format';

interface ProductsPageProps {
  initialQuery: ProductQuery;
  onNavigate: (to: string) => void;
}

export function ProductsPage({ initialQuery, onNavigate }: ProductsPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState(initialQuery.search || '');
  const [categoryId, setCategoryId] = useState(initialQuery.categoryId || 'all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [availability, setAvailability] = useState<'all' | 'available' | 'out_of_stock'>(
    initialQuery.availability || 'all'
  );
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>(
    initialQuery.sort || 'newest'
  );

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const runQuery = useMemo(() => {
    return async () => {
      setLoading(true);
      setError(null);
      try {
        const q: ProductQuery = {
          search: search || undefined,
          categoryId: categoryId !== 'all' ? categoryId : undefined,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          availability,
          sort,
          featured: initialQuery.featured,
          isNew: initialQuery.isNew,
          bestseller: initialQuery.bestseller,
          discounted: initialQuery.discounted,
        };
        const data = await fetchProducts(q);
        setProducts(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'تعذر تحميل المنتجات');
      } finally {
        setLoading(false);
      }
    };
  }, [search, categoryId, minPrice, maxPrice, availability, sort, initialQuery]);

  useEffect(() => {
    runQuery();
  }, [runQuery]);

  const title = initialQuery.featured
    ? 'منتجات مميزة'
    : initialQuery.isNew
    ? 'وصل حديثاً'
    : initialQuery.bestseller
    ? 'الأكثر مبيعاً'
    : initialQuery.discounted
    ? 'عروض وخصومات'
    : search
    ? `نتائج البحث: "${search}"`
    : 'جميع المنتجات';

  const activeFilterCount =
    (categoryId !== 'all' ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (availability !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setCategoryId('all');
    setMinPrice('');
    setMaxPrice('');
    setAvailability('all');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-display font-bold text-charcoal-900">{title}</h1>
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="input py-2 w-auto text-sm"
          >
            <option value="newest">الأحدث</option>
            <option value="price_asc">السعر: الأقل أولاً</option>
            <option value="price_desc">السعر: الأعلى أولاً</option>
          </select>
          <button
            onClick={() => setShowFilters(true)}
            className="btn-outline py-2 px-3 lg:hidden relative"
          >
            <SlidersHorizontal size={16} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -left-1 bg-rose-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <FilterPanel
            categories={categories}
            categoryId={categoryId}
            setCategoryId={setCategoryId}
            minPrice={minPrice}
            setMinPrice={setMinPrice}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            availability={availability}
            setAvailability={setAvailability}
            onReset={resetFilters}
            activeCount={activeFilterCount}
          />
        </aside>

        <div>
          {/* Mobile search */}
          <div className="relative mb-4 lg:hidden">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث..."
              className="input pr-10"
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-64 bg-cream-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-rose-600 font-bold">{error}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto rounded-full bg-cream-100 flex items-center justify-center mb-4">
                <Search size={28} className="text-charcoal-300" />
              </div>
              <p className="font-bold text-charcoal-700">لا توجد منتجات مطابقة</p>
              <p className="text-sm text-charcoal-400 mt-1">جرّب تعديل الفلاتر أو البحث بكلمات أخرى</p>
              {activeFilterCount > 0 && (
                <button onClick={resetFilters} className="btn-outline mt-4">
                  إزالة الفلاتر
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-charcoal-500 mb-3">{products.length} منتج</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onClick={() => onNavigate(`/product/${p.id}`)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-charcoal-900/50" onClick={() => setShowFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-cream-50 rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">الفلاتر</h3>
              <button onClick={() => setShowFilters(false)} className="btn-ghost p-2">
                <X size={20} />
              </button>
            </div>
            <FilterPanel
              categories={categories}
              categoryId={categoryId}
              setCategoryId={setCategoryId}
              minPrice={minPrice}
              setMinPrice={setMinPrice}
              maxPrice={maxPrice}
              setMaxPrice={setMaxPrice}
              availability={availability}
              setAvailability={setAvailability}
              onReset={resetFilters}
              activeCount={activeFilterCount}
            />
            <button onClick={() => setShowFilters(false)} className="btn-primary w-full mt-4">
              عرض النتائج
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterPanel({
  categories,
  categoryId,
  setCategoryId,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  availability,
  setAvailability,
  onReset,
  activeCount,
}: {
  categories: Category[];
  categoryId: string;
  setCategoryId: (v: string) => void;
  minPrice: string;
  setMinPrice: (v: string) => void;
  maxPrice: string;
  setMaxPrice: (v: string) => void;
  availability: 'all' | 'available' | 'out_of_stock';
  setAvailability: (v: 'all' | 'available' | 'out_of_stock') => void;
  onReset: () => void;
  activeCount: number;
}) {
  return (
    <div className="card p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-charcoal-800">تصفية</h3>
        {activeCount > 0 && (
          <button onClick={onReset} className="text-xs text-rose-600 font-bold hover:underline">
            إزالة الكل
          </button>
        )}
      </div>

      <div>
        <label className="label">الفئة</label>
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer py-1">
            <input
              type="radio"
              name="cat"
              checked={categoryId === 'all'}
              onChange={() => setCategoryId('all')}
            />
            <span>الكل</span>
          </label>
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer py-1">
              <input
                type="radio"
                name="cat"
                checked={categoryId === c.id}
                onChange={() => setCategoryId(c.id)}
              />
              <span>{c.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="label">السعر (د.ع)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="من"
            className="input py-2 text-sm"
            min={0}
          />
          <span className="text-charcoal-300">—</span>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="إلى"
            className="input py-2 text-sm"
            min={0}
          />
        </div>
        {(minPrice || maxPrice) && (
          <p className="text-[11px] text-charcoal-400 mt-1">
            {minPrice && formatIQD(Number(minPrice))}
            {minPrice && maxPrice && ' — '}
            {maxPrice && formatIQD(Number(maxPrice))}
          </p>
        )}
      </div>

      <div>
        <label className="label">التوفر</label>
        <div className="space-y-1">
          {[
            { v: 'all', l: 'الكل' },
            { v: 'available', l: 'متوفر' },
            { v: 'out_of_stock', l: 'نفذ المخزون' },
          ].map((o) => (
            <label key={o.v} className="flex items-center gap-2 text-sm cursor-pointer py-1">
              <input
                type="radio"
                name="avail"
                checked={availability === o.v}
                onChange={() => setAvailability(o.v as typeof availability)}
              />
              <span>{o.l}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
