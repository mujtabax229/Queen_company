import { useEffect, useState } from 'react';
import { Users, Trash2, Loader2, ExternalLink, ToggleLeft, ToggleRight, BarChart3, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { confirm } from '@/components/ConfirmHost';
import { fetchStaff, deleteStaff, updateMandoubPermissions } from '@/lib/api';
import type { StaffMember } from '@/lib/types';

interface AdminMandoubsProps {
  onNavigate: (to: string) => void;
}

export function AdminMandoubs({ onNavigate }: AdminMandoubsProps) {
  const { profile } = useAuth();
  const { show } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchStaff();
      setStaff(data);
    } catch {
      show('تعذر تحميل قائمة المندوبين', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (member: StaffMember) => {
    const ok = await confirm({
      title: 'حذف مندوب',
      message: `هل تريد حذف حساب ${member.full_name || member.email}؟ لا يمكن التراجع عن هذا الإجراء.`,
      danger: true,
      confirmText: 'حذف',
    });
    if (!ok) return;
    try {
      await deleteStaff(member.id);
      show('تم حذف المندوب', 'success');
      setSelectedId(null);
      load();
    } catch {
      show('تعذر حذف المندوب', 'error');
    }
  };

  const togglePermission = async (
    member: StaffMember,
    perm: 'can_add_products' | 'can_view_data' | 'can_change_order_status'
  ) => {
    if (!member.permissions) return;
    const newPerms = {
      can_add_products: member.permissions.can_add_products,
      can_view_data: member.permissions.can_view_data,
      can_change_order_status: member.permissions.can_change_order_status,
      [perm]: !member.permissions[perm],
    };
    // Optimistic update
    setStaff((prev) =>
      prev.map((s) =>
        s.id === member.id ? { ...s, permissions: { ...newPerms, user_id: member.id } } : s
      )
    );
    try {
      await updateMandoubPermissions(member.id, newPerms);
      show('تم تحديث الصلاحيات', 'success');
    } catch {
      show('تعذر تحديث الصلاحيات', 'error');
      load();
    }
  };

  const mandoubs = staff.filter((s) => s.role === 'mandoub');
  const selected = mandoubs.find((m) => m.id === selectedId);

  // Detail view
  if (selected) {
    return (
      <div>
        <button
          onClick={() => setSelectedId(null)}
          className="flex items-center gap-1 text-sm text-charcoal-500 hover:text-rose-600 mb-4"
        >
          <ChevronLeft size={16} /> رجوع للقائمة
        </button>

        <div className="card p-6 mb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-cream-200 overflow-hidden flex items-center justify-center shrink-0">
              {selected.photo_url ? (
                <img src={selected.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Users size={28} className="text-charcoal-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-display font-bold text-charcoal-900">
                {selected.full_name || 'بدون اسم'}
              </h2>
              <p className="text-sm text-charcoal-400 truncate" dir="ltr">{selected.email}</p>
              {selected.telegram_link && (
                <a
                  href={selected.telegram_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-rose-600 font-bold hover:underline mt-1"
                >
                  <ExternalLink size={14} /> قناة التلكرام
                </a>
              )}
            </div>
            {selected.id !== profile?.id && (
              <button
                onClick={() => handleDelete(selected)}
                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          {/* Specialty tags */}
          {selected.specialty_tags && selected.specialty_tags.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-charcoal-400 mb-2">التخصصات</p>
              <div className="flex flex-wrap gap-2">
                {selected.specialty_tags.map((tag) => (
                  <span key={tag} className="badge bg-gold-100 text-gold-700">{tag}</span>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-charcoal-400 mb-1">
            حالة التفعيل: {selected.onboarding_complete ? 'مكتمل' : 'لم يكمل الملف'}
          </div>
        </div>

        {/* Permissions */}
        <div className="card p-5">
          <h3 className="font-bold text-sm mb-4">الصلاحيات</h3>
          <div className="space-y-3">
            <PermissionRow
              label="إضافة منتجات"
              description="يمكن للمندوب إنشاء منتجات جديدة مباشرة"
              enabled={selected.permissions?.can_add_products || false}
              onToggle={() => togglePermission(selected, 'can_add_products')}
            />
            <PermissionRow
              label="عرض البيانات"
              description="يمكن للمندوب مشاهدة بيانات الطلبات والمنتجات"
              enabled={selected.permissions?.can_view_data || false}
              onToggle={() => togglePermission(selected, 'can_view_data')}
            />
            <PermissionRow
              label="تغيير حالة الطلبات"
              description="يمكن للمندوب تحديث حالة الطلبات المسندة إليه"
              enabled={selected.permissions?.can_change_order_status || false}
              onToggle={() => togglePermission(selected, 'can_change_order_status')}
            />
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold text-charcoal-900">قائمة المندوبين</h1>
        <button
          onClick={() => onNavigate('/admin/mandoub-signup')}
          className="btn-primary"
        >
          <Users size={18} /> رابط تسجيل مندوب
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-charcoal-300" />
        </div>
      ) : mandoubs.length === 0 ? (
        <div className="card p-10 text-center">
          <Users size={32} className="mx-auto text-charcoal-300 mb-2" />
          <p className="text-charcoal-400">لا يوجد مندوبون بعد</p>
          <p className="text-xs text-charcoal-300 mt-1">شارك رابط التسجيل مع المندوبين</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mandoubs.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              className="card p-4 flex items-center gap-3 w-full text-right hover:shadow-md transition"
            >
              <div className="w-12 h-12 rounded-full bg-cream-200 overflow-hidden flex items-center justify-center shrink-0">
                {m.photo_url ? (
                  <img src={m.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users size={20} className="text-charcoal-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-charcoal-800 truncate">
                  {m.full_name || 'لم يكمل الملف'}
                </p>
                <p className="text-xs text-charcoal-400 truncate" dir="ltr">{m.email}</p>
                <div className="flex items-center gap-1 mt-1">
                  {m.onboarding_complete ? (
                    <span className="badge bg-emerald-100 text-emerald-700">نشط</span>
                  ) : (
                    <span className="badge bg-charcoal-100 text-charcoal-500">بانتظار إكمال الملف</span>
                  )}
                </div>
              </div>
              <ChevronLeft size={18} className="text-charcoal-300 shrink-0" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-4">
        <button
          onClick={() => onNavigate('/admin/performance')}
          className="btn-outline flex items-center gap-2"
        >
          <BarChart3 size={18} /> تقرير أداء المندوبين
        </button>
      </div>
    </div>
  );
}

function PermissionRow({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-bold text-charcoal-800">{label}</p>
        <p className="text-xs text-charcoal-400">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`flex items-center gap-1 shrink-0 transition ${enabled ? 'text-emerald-600' : 'text-charcoal-300'}`}
      >
        {enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
        <span className="text-xs font-bold">{enabled ? 'مفعّل' : 'معطّل'}</span>
      </button>
    </div>
  );
}
