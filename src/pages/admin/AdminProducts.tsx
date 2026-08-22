import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, Upload, Star, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Product, Category, ProductImage, ProductStatus } from '@/lib/types';
import { fetchCategories, createChangeRequest } from '@/lib/api';
import { formatIQD, primaryImage, discountPercent } from '@/lib/format';
import { uploadImage, deleteImage } from '@/lib/upload';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { confirm } from '@/components/ConfirmHost';

const STATUS_LABELS: Record<ProductStatus, string> = {
  available: 'متوفر',
  out_of_stock: 'نفذ المخزون',
  draft: 'مسودة',
};

export function AdminProducts() {
  const { show } = useToast();
  const { isAdmin, permissions } = useAuth();
  const canAddProducts = isAdmin || permissions?.can_add_products || false;
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('products')
      .select('*, category:categories(*), product_images(*)')
      .order('created_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    if (search) q = q.or(`name.ilike.%${search}%,brand.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) {
      show('تعذر تحميل المنتجات', 'error');
    } else {
      setProducts(data as Product[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  const handleDelete = async (p: Product) => {
    if (isAdmin) {
      const ok = await confirm({
        title: 'حذف المنتج',
        message: `هل تريد حذف "${p.name}"؟ لا يمكن التراجع.`,
        danger: true,
        confirmText: 'حذف',
      });
      if (!ok) return;
      const { error } = await supabase.from('products').delete().eq('id', p.id);
      if (error) {
        show('تعذر الحذف: ' + error.message, 'error');
      } else {
        show('تم حذف المنتج', 'success');
        load();
      }
    } else {
      // Mandoub: create a change request
      const ok = await confirm({
        title: 'طلب حذف منتج',
        message: `سيتم إرسال طلب حذف "${p.name}" إلى المدير للمراجعة. لن يتم حذف المنتج إلا بعد موافقة المدير.`,
        confirmText: 'إرسال الطلب',
      });
      if (!ok) return;
      try {
        await createChangeRequest({
          product_id: p.id,
          request_type: 'delete',
          proposed_changes: { name: p.name },
        });
        show('تم إرسال طلب الحذف إلى المدير', 'success');
      } catch {
        show('تعذر إرسال الطلب', 'error');
      }
    }
  };

  const handleSave = () => {
    setShowForm(false);
    setEditing(null);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold text-charcoal-900">المنتجات</h1>
        {canAddProducts && (
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="btn-primary"
          >
            <Plus size={18} /> منتج جديد
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو العلامة..."
            className="input pr-9 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-auto text-sm"
        >
          <option value="all">كل الحالات</option>
          <option value="available">متوفر</option>
          <option value="out_of_stock">نفذ المخزون</option>
          <option value="draft">مسودة</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-charcoal-400">لا توجد منتجات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p) => {
            const img = primaryImage(p);
            const discount = discountPercent(p.price, p.previous_price);
            return (
              <div key={p.id} className="card p-3 flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-cream-100 overflow-hidden shrink-0">
                  {img ? (
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-charcoal-300">
                      <Upload size={18} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-charcoal-800 truncate">{p.name}</h3>
                    <span
                      className={`badge ${
                        p.status === 'available'
                          ? 'bg-emerald-100 text-emerald-700'
                          : p.status === 'out_of_stock'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-charcoal-100 text-charcoal-600'
                      }`}
                    >
                      {STATUS_LABELS[p.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-charcoal-400 mt-0.5">
                    <span className="font-bold text-rose-700">{formatIQD(p.price)}</span>
                    {discount && <span>-{discount}%</span>}
                    <span>• مخزون: {p.stock_qty}</span>
                    {p.is_featured && <Star size={12} className="text-gold-500 fill-gold-500" />}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditing(p);
                      setShowForm(true);
                    }}
                    className="btn-ghost p-2"
                    aria-label="تعديل"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className="btn-ghost p-2 text-rose-600 hover:bg-rose-50"
                    aria-label="حذف"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ProductForm
          product={editing}
          categories={categories}
          isAdmin={isAdmin}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

interface ProductFormProps {
  product: Product | null;
  categories: Category[];
  isAdmin: boolean;
  onClose: () => void;
  onSave: () => void;
}

function ProductForm({ product, categories, isAdmin, onClose, onSave }: ProductFormProps) {
  const { show } = useToast();
  const isEdit = !!product;

  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    category_id: product?.category_id || '',
    brand: product?.brand || '',
    price: product?.price?.toString() || '',
    previous_price: product?.previous_price?.toString() || '',
    stock_qty: product?.stock_qty?.toString() || '0',
    status: product?.status || ('available' as ProductStatus),
    is_featured: product?.is_featured || false,
    is_new: product?.is_new || false,
    is_bestseller: product?.is_bestseller || false,
  });
  const [images, setImages] = useState<ProductImage[]>(product?.product_images || []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (images.length + files.length > 5) {
      show('الحد الأقصى 5 صور لكل منتج', 'error');
      return;
    }
    setUploading(true);
    for (const file of files) {
      const { url, error } = await uploadImage(file, 'products');
      if (error) {
        show(error, 'error');
      } else {
        setImages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            product_id: product?.id || '',
            url,
            sort_order: prev.length + 1,
            is_primary: prev.length === 0,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    }
    setUploading(false);
    e.target.value = '';
  };

  const removeImage = async (img: ProductImage) => {
    setImages((prev) => prev.filter((i) => i.id !== img.id));
    if (img.url.includes('product-images')) await deleteImage(img.url);
  };

  const setPrimary = (id: string) => {
    setImages((prev) => prev.map((i) => ({ ...i, is_primary: i.id === id })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      show('الرجاء إدخال اسم المنتج', 'error');
      return;
    }
    const price = Number(form.price);
    if (isNaN(price) || price < 0) {
      show('السعر غير صحيح', 'error');
      return;
    }
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category_id: form.category_id || null,
      brand: form.brand.trim() || null,
      price,
      previous_price: form.previous_price ? Number(form.previous_price) : null,
      stock_qty: Number(form.stock_qty) || 0,
      status: form.status,
      is_featured: form.is_featured,
      is_new: form.is_new,
      is_bestseller: form.is_bestseller,
    };

    try {
      let productId = product?.id;
      if (isEdit && productId) {
        if (isAdmin) {
          // Admin: direct update
          const { error } = await supabase.from('products').update(payload).eq('id', productId);
          if (error) throw error;
          // Replace images: delete old, insert new
          await supabase.from('product_images').delete().eq('product_id', productId);
        } else {
          // Mandoub: create change request
          await createChangeRequest({
            product_id: productId,
            request_type: 'edit',
            proposed_changes: payload as Record<string, unknown>,
          });
          show('تم إرسال طلب التعديل إلى المدير للمراجعة', 'success');
          onSave();
          return;
        }
      } else {
        const { data, error } = await supabase.from('products').insert(payload).select().single();
        if (error) throw error;
        productId = data.id;
      }

      if (images.length > 0 && productId) {
        const imgRows = images
          .filter((i) => i.url)
          .map((i, idx) => ({
            product_id: productId,
            url: i.url,
            sort_order: idx + 1,
            is_primary: idx === 0 ? true : i.is_primary,
          }));
        if (imgRows.length > 0) {
          const { error: imgErr } = await supabase.from('product_images').insert(imgRows);
          if (imgErr) throw imgErr;
        }
      }

      show(isEdit ? (isAdmin ? 'تم تحديث المنتج' : 'تم إرسال طلب التعديل') : 'تم إنشاء المنتج', 'success');
      onSave();
    } catch (err) {
      show(err instanceof Error ? err.message : 'تعذر حفظ المنتج', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-charcoal-900/50 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative card w-full max-w-2xl my-8 p-6 animate-scaleIn"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-display font-bold">
            {isEdit ? (isAdmin ? 'تعديل المنتج' : 'اقتراح تعديل المنتج') : 'منتج جديد'}
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost p-2">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">اسم المنتج *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              required
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">الفئة</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="input"
              >
                <option value="">بدون فئة</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">العلامة التجارية</label>
              <input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">الوصف</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input min-h-[80px]"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label">السعر (د.ع) *</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="input"
                min={0}
                required
              />
            </div>
            <div>
              <label className="label">السعر السابق</label>
              <input
                type="number"
                value={form.previous_price}
                onChange={(e) => setForm({ ...form, previous_price: e.target.value })}
                className="input"
                min={0}
                placeholder="اختياري"
              />
            </div>
            <div>
              <label className="label">الكمية</label>
              <input
                type="number"
                value={form.stock_qty}
                onChange={(e) => setForm({ ...form, stock_qty: e.target.value })}
                className="input"
                min={0}
              />
            </div>
          </div>

          <div>
            <label className="label">الحالة</label>
            <div className="flex gap-2">
              {(Object.keys(STATUS_LABELS) as ProductStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({ ...form, status: s })}
                  className={`px-3 py-2 rounded-lg text-sm font-bold transition ${
                    form.status === s
                      ? 'bg-charcoal-800 text-white'
                      : 'bg-cream-100 text-charcoal-600 hover:bg-cream-200'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            {[
              { k: 'is_featured', l: 'مميز' },
              { k: 'is_new', l: 'جديد' },
              { k: 'is_bestseller', l: 'الأكثر مبيعاً' },
            ].map((f) => (
              <label key={f.k} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[f.k as keyof typeof form] as boolean}
                  onChange={(e) => setForm({ ...form, [f.k]: e.target.checked })}
                />
                <span className="font-bold">{f.l}</span>
              </label>
            ))}
          </div>

          {/* Images */}
          <div>
            <label className="label">الصور (حتى 5 صور، مربعة أو 3:4)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {images.map((img) => (
                <div key={img.id} className="relative w-20 h-20 group">
                  <img
                    src={img.url}
                    alt=""
                    className={`w-full h-full object-cover rounded-lg border-2 ${
                      img.is_primary ? 'border-rose-500' : 'border-cream-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(img)}
                    className="absolute -top-1 -left-1 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                  >
                    <X size={12} />
                  </button>
                  {!img.is_primary && (
                    <button
                      type="button"
                      onClick={() => setPrimary(img.id)}
                      className="absolute bottom-0 right-0 bg-white/90 text-[9px] font-bold px-1 rounded m-0.5 opacity-0 group-hover:opacity-100 transition"
                    >
                      رئيسية
                    </button>
                  )}
                </div>
              ))}
              {images.length < 5 && (
                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-charcoal-200 flex items-center justify-center cursor-pointer hover:border-rose-400 transition text-charcoal-300">
                  {uploading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Upload size={18} />
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 size={18} className="animate-spin" /> : isEdit ? (isAdmin ? 'حفظ التغييرات' : 'إرسال طلب التعديل') : 'إنشاء'}
          </button>
          <button type="button" onClick={onClose} className="btn-outline">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
