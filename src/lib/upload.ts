import { supabase } from '@/lib/supabase';

export interface UploadResult {
  url: string;
  error: string | null;
}

const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_BYTES = 3 * 1024 * 1024;

export async function uploadImage(
  file: File,
  folder: 'products' | 'categories' | 'logo' | 'mandoub-photos'
): Promise<UploadResult> {
  if (!ALLOWED.includes(file.type)) {
    return { url: '', error: 'صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WEBP.' };
  }
  if (file.size > MAX_BYTES) {
    return { url: '', error: 'حجم الصورة كبير جداً (الحد 3 ميجابايت).' };
  }

  // Aspect ratio check ~3:4 or 1:1
  const ratioOk = await checkAspectRatio(file);
  if (!ratioOk.ok) {
    return { url: '', error: ratioOk.message };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from('product-images')
    .upload(fileName, file, { contentType: file.type, upsert: false });

  if (error) {
    return { url: '', error: 'تعذر رفع الصورة: ' + error.message };
  }

  const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
  return { url: data.publicUrl, error: null };
}

async function checkAspectRatio(
  file: File
): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.width;
      const h = img.height;
      if (w === 0 || h === 0) {
        resolve({ ok: true, message: '' });
        return;
      }
      const ratio = w / h;
      // Allow 1:1 (ratio ~1) or 3:4 (ratio ~0.75) within tolerance
      const isSquare = Math.abs(ratio - 1) < 0.15;
      const isPortrait = Math.abs(ratio - 0.75) < 0.15;
      if (isSquare || isPortrait) {
        resolve({ ok: true, message: '' });
      } else {
        resolve({
          ok: false,
          message: 'نسبة الصورة غير صحيحة. يجب أن تكون مربعة (1:1) أو عمودية (3:4).',
        });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ ok: false, message: 'تعذر قراءة الصورة.' });
    };
    img.src = url;
  });
}

export async function deleteImage(url: string): Promise<void> {
  try {
    const urlObj = new URL(url);
    const idx = urlObj.pathname.indexOf('/product-images/');
    if (idx === -1) return;
    const path = urlObj.pathname.slice(idx + '/product-images/'.length);
    await supabase.storage.from('product-images').remove([path]);
  } catch {
    // ignore
  }
}
