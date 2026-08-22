import { useEffect, useState } from 'react';
import { Loader2, Check, X, Pencil, Trash2, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { confirm } from '@/components/ConfirmHost';
import { fetchChangeRequests, approveChangeRequest, rejectChangeRequest } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { formatIQD, primaryImage } from '@/lib/format';
import type { ProductChangeRequest, Product } from '@/lib/types';

export function AdminChangeRequests() {
  const { profile } = useAuth();
  const { show } = useToast();
  const [requests, setRequests] = useState<ProductChangeRequest[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [mandoubNames, setMandoubNames] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchChangeRequests();
      setRequests(data);

      // Fetch related products
      const productIds = data.map((r) => r.product_id).filter(Boolean) as string[];
      if (productIds.length > 0) {
        const { data: prods } = await supabase
          .from('products')
          .select('*, product_images(*)')
          .in('id', productIds);
        const map: Record<string, Product> = {};
        for (const p of prods || []) {
          map[p.id] = p as Product;
        }
        setProducts(map);
      }

      // Fetch mandoub names
      const mandoubIds = [...new Set(data.map((r) => r.mandoub_id))];
      if (mandoubIds.length > 0) {
        const { data: profiles } = await supabase
          .from('mandoub_profiles')
          .select('user_id, full_name')
          .in('user_id', mandoubIds);
        const nameMap: Record<string, string> = {};
        for (const p of profiles || []) {
          nameMap[p.user_id] = p.full_name;
        }
        setMandoubNames(nameMap);
      }
    } catch {
      show('تعذر تحميل الطلبات', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = async (req: ProductChangeRequest) => {
    if (!profile) return;
    if (req.request_type === 'delete') {
      const ok = await confirm({
        title: 'الموافقة على الحذف',
        message: `سيتم حذف المنتج "${products[req.product_id || '']?.name || ''}" نهائياً.`,
        danger: true,
        confirmText: 'موافقة وحذف',
      });
      if (!ok) return;
    }

    try {
      // If edit, apply the proposed changes to the product
      if (req.request_type === 'edit' && req.product_id && req.proposed_changes) {
        const { error } = await supabase
          .from('products')
          .update(req.proposed_changes)
          .eq('id', req.product_id);
        if (error) throw error;
      }

      // If delete, delete the product
      if (req.request_type === 'delete' && req.product_id) {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', req.product_id);
        if (error) throw error;
      }

      await approveChangeRequest(req.id, profile.id);
      show('تمت الموافقة على الطلب وتطبيق التغييرات', 'success');
      load();
    } catch (err) {
      show(err instanceof Error ? err.message : 'تعذر الموافقة على الطلب', 'error');
    }
  };

  const handleReject = async (req: ProductChangeRequest) => {
    if (!profile) return;
    try {
      await rejectChangeRequest(req.id, profile.id);
      show('تم رفض الطلب', 'success');
      load();
    } catch {
      show('تعذر رفض الطلب', 'error');
    }
  };

  const pending = requests.filter((r) => r.status === 'pending');
  const reviewed = requests.filter((r) => r.status !== 'pending');

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-charcoal-300" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-charcoal-900 mb-5">
        طلبات تعديل المنتجات
      </h1>

      {pending.length === 0 && reviewed.length === 0 ? (
        <div className="card p-10 text-center">
          <Clock size={32} className="mx-auto text-charcoal-300 mb-2" />
          <p className="text-charcoal-400">لا توجد طلبات معلقة</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3 mb-6">
              <h2 className="font-bold text-sm text-charcoal-600">بانتظار المراجعة ({pending.length})</h2>
              {pending.map((req) => (
                <ChangeRequestCard
                  key={req.id}
                  req={req}
                  product={req.product_id ? products[req.product_id] : null}
                  mandoubName={mandoubNames[req.mandoub_id] || 'مندوب'}
                  onApprove={() => handleApprove(req)}
                  onReject={() => handleReject(req)}
                />
              ))}
            </div>
          )}

          {reviewed.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-bold text-sm text-charcoal-600">تمت المراجعة</h2>
              {reviewed.slice(0, 10).map((req) => (
                <div key={req.id} className="card p-3 flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-bold">{mandoubNames[req.mandoub_id] || 'مندوب'}</span>
                    <span className="text-charcoal-400"> — </span>
                    <span>{req.request_type === 'edit' ? 'تعديل' : 'حذف'}</span>
                    {req.product_id && products[req.product_id] && (
                      <span className="text-charcoal-400"> — {products[req.product_id].name}</span>
                    )}
                  </div>
                  <span
                    className={`badge ${
                      req.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {req.status === 'approved' ? 'موافق عليه' : 'مرفوض'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ChangeRequestCard({
  req,
  product,
  mandoubName,
  onApprove,
  onReject,
}: {
  req: ProductChangeRequest;
  product: Product | null;
  mandoubName: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isEdit = req.request_type === 'edit';
  const changes = req.proposed_changes || {};

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
          isEdit ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
        }`}>
          {isEdit ? <Pencil size={18} /> : <Trash2 size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-charcoal-800">
            {mandoubName} يقترح {isEdit ? 'تعديل' : 'حذف'} المنتج
          </p>
          <p className="text-xs text-charcoal-400">
            {product?.name || 'منتج محذوف'}
          </p>
        </div>
      </div>

      {/* Before/after for edits */}
      {isEdit && product && (
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div className="bg-cream-50 rounded-lg p-3">
            <p className="text-xs text-charcoal-400 mb-1">الحالي</p>
            <div className="space-y-1 text-sm">
              <DiffRow label="الاسم" oldVal={product.name} newVal={changes.name as string} />
              <DiffRow label="السعر" oldVal={formatIQD(product.price)} newVal={changes.price != null ? formatIQD(changes.price as number) : undefined} />
              <DiffRow label="المخزون" oldVal={String(product.stock_qty)} newVal={changes.stock_qty != null ? String(changes.stock_qty) : undefined} />
              <DiffRow label="العلامة" oldVal={product.brand || '—'} newVal={changes.brand as string} />
            </div>
          </div>
          <div className="bg-rose-50 rounded-lg p-3">
            <p className="text-xs text-rose-400 mb-1">المقترح</p>
            {product.product_images && product.product_images.length > 0 && (
              <div className="w-16 h-16 rounded bg-cream-100 overflow-hidden mb-2">
                <img src={primaryImage(product) || ''} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <p className="text-xs text-charcoal-500">راجع التغييرات المقترحة بعناية قبل الموافقة</p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onApprove} className="btn-primary flex-1 text-sm">
          <Check size={16} /> موافقة
        </button>
        <button onClick={onReject} className="btn-outline text-sm text-rose-600 border-rose-200">
          <X size={16} /> رفض
        </button>
      </div>
    </div>
  );
}

function DiffRow({ label, oldVal, newVal }: { label: string; oldVal: string; newVal?: string }) {
  if (newVal === undefined || newVal === oldVal) {
    return (
      <div className="flex justify-between">
        <span className="text-charcoal-400">{label}</span>
        <span className="font-bold text-charcoal-600">{oldVal}</span>
      </div>
    );
  }
  return (
    <div className="flex justify-between">
      <span className="text-charcoal-400">{label}</span>
      <span>
        <span className="line-through text-charcoal-300">{oldVal}</span>
        <span className="text-rose-700 font-bold mr-1"> ← {newVal}</span>
      </span>
    </div>
  );
}
