import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, Upload, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/lib/types';
import { uploadImage, deleteImage } from '@/lib/upload';
import { useToast } from '@/context/ToastContext';
import { confirm } from '@/components/ConfirmHost';

const MAX_CATEGORIES = 10;

export function AdminCategories() {
  const { show } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      show('تعذر تحميل الفئات', 'error');
    } else {
      setCategories(data as Category[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (c: Category) => {
    const ok = await confirm({
      title: 'حذف الفئة',
      message: `هل تريد حذف "${c.name}"؟ المنتجات المرتبطة ستبقى لكن بدون فئة.`,
      danger: true,
      confirmText: 'حذف',
    });
    if (!ok) return;
    const { error } = await supabase.from('categories').delete().eq('id', c.id);
    if (error) {
      show('تعذر الحذف: ' + error.message, 'error');
    } else {
      if (c.image_url?.includes('product-images')) await deleteImage(c.image_url);
      show('تم حذف الفئة', 'success');
      load();
    }
  };

  const move = async (c: Category, dir: -1 | 1) => {
    const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((x) => x.id === c.id);
    const swapWith = sorted[idx + dir];
    if (!swapWith) return;
    await Promise.all([
      supabase.from('categories').update({ sort_order: swapWith.sort_order }).eq('id', c.id),
      supabase.from('categories').update({ sort_order: c.sort_order }).eq('id', swapWith.id),
    ]);
    load();
  };

  const canAdd = categories.length < MAX_CATEGORIES;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-charcoal-900">الفئات</h1>
          <p className="text-sm text-charcoal-400 mt-0.5">
            {categories.length} / {MAX_CATEGORIES} فئة
          </p>
        </div>
        <button
          onClick={() => {
            if (!canAdd) {
              show(`الحد الأقصى ${MAX_CATEGORIES} فئات`, 'error');
              return;
            }
            setEditing(null);
            setShowForm(true);
          }}
          disabled={!canAdd}
          className="btn-primary disabled:opacity-50"
        >
          <Plus size={18} /> فئة جديدة
        </button>
      </div>

      {!canAdd && (
        <div className="card p-3 mb-4 bg-gold-50/50 border-gold-200 text-sm text-charcoal-700">
          وصلت إلى الحد الأقصى ({MAX_CATEGORIES} فئات). احذف فئة لإضافة أخرى.
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-charcoal-400">لا توجد فئات بعد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((c, idx) => (
            <div key={c.id} className="card p-3 flex items-center gap-3">
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => move(c, -1)}
                  disabled={idx === 0}
                  className="btn-ghost p-1 disabled:opacity-20"
                  aria-label="أعلى"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  onClick={() => move(c, 1)}
                  disabled={idx === categories.length - 1}
                  className="btn-ghost p-1 disabled:opacity-20"
                  aria-label="أسفل"
                >
                  <ArrowDown size={14} />
                </button>
              </div>
              <div className="w-12 h-12 rounded-lg bg-cream-100 overflow-hidden shrink-0">
                {c.image_url ? (
                  <img src={c.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-charcoal-300">
                    <Upload size={16} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-charcoal-800">{c.name}</h3>
                <p className="text-xs text-charcoal-400">الترتيب: {c.sort_order}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => {
                    setEditing(c);
                    setShowForm(true);
                  }}
                  className="btn-ghost p-2"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  className="btn-ghost p-2 text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CategoryForm
          category={editing}
          onClose={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CategoryForm({
  category,
  onClose,
  onSave,
}: {
  category: Category | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const { show } = useToast();
  const [name, setName] = useState(category?.name || '');
  const [imageUrl, setImageUrl] = useState(category?.image_url || '');
  const [sortOrder, setSortOrder] = useState(category?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { url, error } = await uploadImage(file, 'categories');
    setUploading(false);
    if (error) {
      show(error, 'error');
    } else {
      setImageUrl(url);
    }
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      show('الرجاء إدخال اسم الفئة', 'error');
      return;
    }
    setSaving(true);
    try {
      if (category) {
        const { error } = await supabase
          .from('categories')
          .update({ name: name.trim(), image_url: imageUrl || null, sort_order: sortOrder })
          .eq('id', category.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categories')
          .insert({ name: name.trim(), image_url: imageUrl || null, sort_order: sortOrder });
        if (error) throw error;
      }
      show(category ? 'تم تحديث الفئة' : 'تم إنشاء الفئة', 'success');
      onSave();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذر الحفظ';
      show(msg.includes('10') ? 'الحد الأقصى 10 فئات' : msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-charcoal-900/50 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative card w-full max-w-md my-8 p-6 animate-scaleIn">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-display font-bold">
            {category ? 'تعديل الفئة' : 'فئة جديدة'}
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost p-2">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">اسم الفئة *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">الترتيب</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="input"
              min={0}
            />
          </div>

          <div>
            <label className="label">الصورة</label>
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-lg bg-cream-100 overflow-hidden border border-cream-200">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-charcoal-300">
                    <Upload size={18} />
                  </div>
                )}
              </div>
              <label className="btn-outline cursor-pointer">
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                رفع صورة
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleUpload}
                  className="hidden"
                />
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="btn-ghost text-rose-600 text-sm"
                >
                  إزالة
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 size={18} className="animate-spin" /> : category ? 'حفظ' : 'إنشاء'}
          </button>
          <button type="button" onClick={onClose} className="btn-outline">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
