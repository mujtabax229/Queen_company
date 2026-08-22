import { useState } from 'react';
import { Lock, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AdminLoginProps {
  onNavigate: (to: string) => void;
}

export function AdminLogin({ onNavigate }: AdminLoginProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      setError('بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور.');
      return;
    }
    onNavigate('/admin');
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-charcoal-800 text-white flex items-center justify-center mb-3">
            <Lock size={26} />
          </div>
          <h1 className="text-xl font-display font-bold text-charcoal-900">لوحة التحكم</h1>
          <p className="text-sm text-charcoal-500 mt-1">سجّل الدخول للمتابعة</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="admin@example.com"
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
            />
          </div>

          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-dark w-full">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <>دخول</>}
          </button>
        </form>

        <button
          onClick={() => onNavigate('/')}
          className="flex items-center gap-1 text-sm text-charcoal-400 hover:text-rose-600 mx-auto mt-4"
        >
          <ArrowRight size={16} /> العودة للمتجر
        </button>
      </div>
    </div>
  );
}
