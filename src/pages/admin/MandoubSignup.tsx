import { useState } from 'react';
import { UserPlus, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';

interface MandoubSignupProps {
  onNavigate: (to: string) => void;
}

export function MandoubSignup({ onNavigate }: MandoubSignupProps) {
  const { show } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون ٦ أحرف على الأقل');
      return;
    }
    setLoading(true);

    try {
      const { error: fnError } = await supabase.functions.invoke('mandoub-signup', {
        method: 'POST',
        body: { email: email.trim(), password },
      });

      if (fnError) {
        const msg = fnError.context ? await fnError.context.text().catch(() => '') : fnError.message;
        try {
          const parsed = JSON.parse(msg);
          setError(parsed.error || 'تعذر إنشاء الحساب');
        } catch {
          setError('تعذر إنشاء الحساب');
        }
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        show('تم إنشاء الحساب! سجّل الدخول بلوحة التحكم', 'success');
        onNavigate('/admin');
        return;
      }

      show('مرحباً بك! أكمل ملفك للمتابعة', 'success');
      onNavigate('/admin/onboarding');
    } catch {
      setError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mb-3">
            <UserPlus size={26} />
          </div>
          <h1 className="text-xl font-display font-bold text-charcoal-900">تسجيل مندوب جديد</h1>
          <p className="text-sm text-charcoal-500 mt-1">أنشئ حسابك وابدأ بإدارة طلباتك</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="email@example.com"
              dir="ltr"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              dir="ltr"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="label">تأكيد كلمة المرور</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input"
              placeholder="••••••••"
              dir="ltr"
              required
              minLength={6}
            />
          </div>

          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <>إنشاء الحساب</>}
          </button>
        </form>

        <button
          onClick={() => onNavigate('/admin')}
          className="flex items-center gap-1 text-sm text-charcoal-400 hover:text-rose-600 mx-auto mt-4"
        >
          <ArrowRight size={16} /> لدي حساب، تسجيل الدخول
        </button>
      </div>
    </div>
  );
}
