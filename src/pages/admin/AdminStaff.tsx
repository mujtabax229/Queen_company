import { useEffect, useState } from 'react';
import { UserPlus, Trash2, Loader2, Shield, Users, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { confirm } from '@/components/ConfirmHost';
import type { UserRole } from '@/lib/types';

interface StaffMember {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export function AdminStaff() {
  const { profile } = useAuth();
  const { show } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', role: 'mandoub' as UserRole });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('staff-management', {
      method: 'GET',
    });
    if (error) {
      show('تعذر تحميل قائمة الموظفين', 'error');
    } else {
      setStaff(data.staff || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      show('البريد وكلمة المرور مطلوبان', 'error');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.functions.invoke('staff-management', {
      method: 'POST',
      body: { email: form.email.trim(), password: form.password, role: form.role },
    });
    setSubmitting(false);
    if (error) {
      const msg = error.context ? await error.context.text().catch(() => '') : error.message;
      try {
        const parsed = JSON.parse(msg);
        show(parsed.error || 'تعذر إضافة الموظف', 'error');
      } catch {
        show('تعذر إضافة الموظف', 'error');
      }
      return;
    }
    show('تم إضافة الموظف بنجاح', 'success');
    setForm({ email: '', password: '', role: 'mandoub' });
    setShowAddForm(false);
    load();
  };

  const handleDelete = async (member: StaffMember) => {
    const ok = await confirm({
      title: 'حذف موظف',
      message: `هل تريد حذف حساب ${member.email}؟ لا يمكن التراجع عن هذا الإجراء.`,
      danger: true,
      confirmText: 'حذف',
    });
    if (!ok) return;
    const { error } = await supabase.functions.invoke('staff-management', {
      method: 'DELETE',
      body: { id: member.id },
    });
    if (error) {
      show('تعذر حذف الموظف', 'error');
      return;
    }
    show('تم حذف الموظف', 'success');
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold text-charcoal-900">إدارة الموظفين</h1>
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary">
          <UserPlus size={18} /> إضافة موظف
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="card p-5 mb-4 space-y-4 animate-scaleIn">
          <h3 className="font-bold text-sm">حساب جديد</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">البريد الإلكتروني</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
                placeholder="mandoub@example.com"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="label">كلمة المرور</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input"
                placeholder="٦ أحرف على الأقل"
                dir="ltr"
                minLength={6}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">الصلاحية</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  checked={form.role === 'mandoub'}
                  onChange={() => setForm({ ...form, role: 'mandoub' })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-bold">مندوب</span>
                <span className="text-xs text-charcoal-400">— مشاهدة الطلبات وتحديث حالتها فقط</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  checked={form.role === 'admin'}
                  onChange={() => setForm({ ...form, role: 'admin' })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-bold">مدير</span>
                <span className="text-xs text-charcoal-400">— صلاحيات كاملة</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
              إنشاء الحساب
            </button>
            <button type="button" onClick={() => setShowAddForm(false)} className="btn-ghost">
              إلغاء
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-charcoal-300" />
        </div>
      ) : staff.length === 0 ? (
        <div className="card p-10 text-center">
          <Users size={32} className="mx-auto text-charcoal-300 mb-2" />
          <p className="text-charcoal-400">لا يوجد موظفون</p>
        </div>
      ) : (
        <div className="space-y-2">
          {staff.map((member) => (
            <div
              key={member.id}
              className="card p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    member.role === 'admin'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-gold-100 text-gold-700'
                  }`}
                >
                  {member.role === 'admin' ? <Shield size={18} /> : <Users size={18} />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-charcoal-800 flex items-center gap-1 truncate">
                    <Mail size={14} className="text-charcoal-400 shrink-0" />
                    <span className="truncate" dir="ltr">{member.email}</span>
                  </p>
                  <span
                    className={`badge mt-1 ${
                      member.role === 'admin'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-gold-100 text-gold-700'
                    }`}
                  >
                    {member.role === 'admin' ? 'مدير' : 'مندوب'}
                  </span>
                </div>
              </div>
              {member.id !== profile?.id && (
                <button
                  onClick={() => handleDelete(member)}
                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition shrink-0"
                  aria-label="حذف"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card p-4 mt-6 bg-cream-50 border-cream-200">
        <p className="text-xs text-charcoal-500 leading-relaxed">
          المندوب يمكنه مشاهدة الطلبات وتحديث حالتها فقط (جديد، قيد التجهيز، تم الشحن، مكتمل، ملغي).
          لا يمكنه الوصول إلى المنتجات، الفئات، الإعدادات، أو إدارة الموظفين.
        </p>
      </div>
    </div>
  );
}
