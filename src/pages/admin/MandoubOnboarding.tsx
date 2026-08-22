import { useState, useRef } from 'react';
import { Loader2, Upload, User, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { uploadImage } from '@/lib/upload';
import type { MandoubProfile } from '@/lib/types';

const SPECIALTY_TAGS = [
  'كوزمتك', 'المشدات', 'التجارب', 'التصوير', 'الملابس',
  'العطور', 'ستوريات', 'العروض', 'الطباعة', 'الاكسسوارات و الهدايا', 'المنزلي',
];

interface MandoubOnboardingProps {
  onNavigate: (to: string) => void;
}

export function MandoubOnboarding({ onNavigate }: MandoubOnboardingProps) {
  const { profile, signOut } = useAuth();
  const { show } = useToast();
  const [fullName, setFullName] = useState('');
  const [telegramLink, setTelegramLink] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { url, error } = await uploadImage(file, 'mandoub-photos');
    if (error) {
      show(error, 'error');
    } else {
      setPhotoUrl(url);
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      show('الرجاء إدخال الاسم الكامل', 'error');
      return;
    }
    if (selectedTags.size === 0) {
      show('الرجاء اختيار تخصص واحد على الأقل', 'error');
      return;
    }
    if (!profile) return;
    setSaving(true);

    try {
      const profileData: Partial<MandoubProfile> & { user_id: string } = {
        user_id: profile.id,
        full_name: fullName.trim(),
        telegram_link: telegramLink.trim() || null,
        photo_url: photoUrl,
        specialty_tags: Array.from(selectedTags),
        onboarding_complete: true,
      };
      const { error } = await supabase.from('mandoub_profiles').upsert(profileData);
      if (error) throw error;
      show('تم حفظ ملفك بنجاح', 'success');
      onNavigate('/admin');
    } catch (err) {
      show(err instanceof Error ? err.message : 'تعذر حفظ الملف', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onNavigate('/');
  };

  return (
    <div className="min-h-screen bg-cream-100 flex items-start justify-center p-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-display font-bold text-charcoal-900">أكمل ملفك</h1>
          <p className="text-sm text-charcoal-500 mt-1">
            هذه المعلومات ضرورية لتفعيل حسابك كمندوب
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-5">
          {/* Photo */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-24 h-24 rounded-full bg-cream-200 border-2 border-cream-300 overflow-hidden flex items-center justify-center">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={36} className="text-charcoal-300" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-sm text-rose-600 font-bold hover:underline flex items-center gap-1"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {photoUrl ? 'تغيير الصورة' : 'رفع صورة شخصية'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          {/* Full name */}
          <div>
            <label className="label">الاسم الكامل *</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              placeholder="مثال: أحمد علي"
              required
            />
          </div>

          {/* Telegram link */}
          <div>
            <label className="label">رابط قناة التلكرام</label>
            <input
              value={telegramLink}
              onChange={(e) => setTelegramLink(e.target.value)}
              className="input"
              placeholder="https://t.me/yourchannel"
              dir="ltr"
            />
          </div>

          {/* Specialty tags */}
          <div>
            <label className="label">التخصصات * (اختر ما يناسبك)</label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-2 rounded-lg text-sm font-bold transition ${
                    selectedTags.has(tag)
                      ? 'bg-rose-600 text-white'
                      : 'bg-cream-100 text-charcoal-600 hover:bg-cream-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Send size={18} /> حفظ والمتابعة
              </>
            )}
          </button>
        </form>

        <button
          onClick={handleSignOut}
          className="text-sm text-charcoal-400 hover:text-rose-600 mx-auto mt-4 block"
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
