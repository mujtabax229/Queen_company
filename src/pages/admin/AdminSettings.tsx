import { useEffect, useState } from 'react';
import { Loader2, Upload, Save, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { StoreSettings } from '@/lib/types';
import { uploadImage, deleteImage } from '@/lib/upload';
import { useStoreSettings } from '@/lib/useStoreSettings';
import { useToast } from '@/context/ToastContext';
import { PhoneInput, extractLocalPhone, validateLocalPhone } from '@/components/PhoneInput';

function normalizeWhatsapp(full: string): string {
  const local = extractLocalPhone(full);
  return local.replace(/[^0-9]/g, '');
}

export function AdminSettings() {
  const { show } = useToast();
  const { settings, loading, setSettings } = useStoreSettings();
  const [form, setForm] = useState<StoreSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({ ...settings, social_links: { ...settings.social_links } });
    }
  }, [settings]);

  if (loading || !form) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={24} className="animate-spin text-charcoal-300" />
      </div>
    );
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { url, error } = await uploadImage(file, 'logo');
    setUploading(false);
    if (error) {
      show(error, 'error');
    } else {
      if (form.logo_url?.includes('product-images')) await deleteImage(form.logo_url);
      setForm({ ...form, logo_url: url });
      show('تم رفع الشعار', 'success');
    }
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.store_name.trim()) {
      show('الرجاء إدخال اسم المتجر', 'error');
      return;
    }
    if (!form.whatsapp_number.trim()) {
      show('الرجاء إدخال رقم واتساب', 'error');
      return;
    }
    const whatsappErr = validateLocalPhone(extractLocalPhone(form.whatsapp_number));
    if (whatsappErr) {
      show('رقم واتساب: ' + whatsappErr, 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('store_settings')
      .update({
        store_name: form.store_name.trim(),
        store_name_ar: form.store_name_ar.trim(),
        logo_url: form.logo_url || null,
        whatsapp_number: normalizeWhatsapp(form.whatsapp_number),
        delivery_fee: Number(form.delivery_fee) || 0,
        contact_info: form.contact_info || null,
        social_links: form.social_links,
      })
      .eq('id', 1);
    setSaving(false);
    if (error) {
      show('تعذر الحفظ: ' + error.message, 'error');
    } else {
      setSettings(form);
      show('تم حفظ الإعدادات', 'success');
    }
  };

  const setSocial = (key: string, value: string) => {
    setForm({ ...form, social_links: { ...form.social_links, [key]: value } });
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-charcoal-900 mb-5">إعدادات المتجر</h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        {/* Logo */}
        <div className="card p-5">
          <label className="label">شعار المتجر</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-cream-100 overflow-hidden border border-cream-200 flex items-center justify-center">
              {form.logo_url ? (
                <img src={form.logo_url} alt="شعار" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-rose-600 text-white font-display font-bold text-2xl">
                  IQ
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <label className="btn-outline cursor-pointer">
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                رفع شعار
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
              {form.logo_url && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, logo_url: null })}
                  className="btn-ghost text-rose-600 text-sm"
                >
                  إزالة
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Names */}
        <div className="card p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">اسم المتجر (إنجليزي)</label>
              <input
                value={form.store_name}
                onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                className="input"
                dir="ltr"
              />
            </div>
            <div>
              <label className="label">اسم المتجر (عربي)</label>
              <input
                value={form.store_name_ar}
                onChange={(e) => setForm({ ...form, store_name_ar: e.target.value })}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="card p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">رقم واتساب</label>
              <PhoneInput
                value={form.whatsapp_number}
                onChange={(full) => setForm({ ...form, whatsapp_number: full })}
                placeholder="7XX XXX XXXX"
              />
              <p className="text-[11px] text-charcoal-400 mt-1">رقم عراقي يبدأ بـ ٧</p>
            </div>
            <div>
              <label className="label">رسوم التوصيل (د.ع)</label>
              <input
                type="number"
                value={form.delivery_fee}
                onChange={(e) => setForm({ ...form, delivery_fee: Number(e.target.value) })}
                className="input"
                min={0}
              />
            </div>
          </div>
          <div>
            <label className="label">معلومات التواصل</label>
            <PhoneInput
              value={form.contact_info || ''}
              onChange={(full) => setForm({ ...form, contact_info: full })}
              placeholder="7XX XXX XXXX"
            />
          </div>
        </div>

        {/* Social */}
        <div className="card p-5 space-y-4">
          <h3 className="font-bold text-sm">روابط التواصل الاجتماعي</h3>
          {[
            { k: 'instagram', l: 'انستغرام', ph: 'https://instagram.com/...' },
            { k: 'tiktok', l: 'تيك توك', ph: 'https://tiktok.com/@...' },
            { k: 'facebook', l: 'فيسبوك', ph: 'https://facebook.com/...' },
          ].map((s) => (
            <div key={s.k}>
              <label className="label">{s.l}</label>
              <input
                value={form.social_links?.[s.k] || ''}
                onChange={(e) => setSocial(s.k, e.target.value)}
                className="input"
                placeholder={s.ph}
                dir="ltr"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            حفظ الإعدادات
          </button>
        </div>
      </form>

      <div className="card p-5 mt-8 max-w-2xl border-cream-200">
        <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
          <LogOut size={16} /> معلومات حساب المدير
        </h3>
        <p className="text-sm text-charcoal-600">
          لإضافة موظفين جدد (مندوبين أو مديرين)، استخدم صفحة "الموظفون" في القائمة الجانبية.
        </p>
      </div>
    </div>
  );
}
