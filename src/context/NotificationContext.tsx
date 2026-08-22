import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Order } from '@/lib/types';

type NotificationType = 'order' | 'mandoub' | 'change_request';

interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  subtitle?: string;
  createdAt: number;
}

interface NotificationState {
  unreadCount: number;
  notifications: AppNotification[];
  markAllRead: () => void;
  markRead: (id: string) => void;
  isOrderUnread: (orderId: string) => boolean;
  markOrderRead: (orderId: string) => void;
}

const NotificationContext = createContext<NotificationState | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { profile, isAdmin, isStaff, loading: authLoading } = useAuth();
  const { show } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const toastShownRef = useRef<Set<string>>(new Set());

  const addNotification = (n: Omit<AppNotification, 'id' | 'createdAt'>) => {
    const id = `${n.type}-${Date.now()}-${Math.random()}`;
    const full: AppNotification = { ...n, id, createdAt: Date.now() };
    setNotifications((prev) => [full, ...prev].slice(0, 50));

    // Show toast with appropriate color
    if (n.type === 'mandoub') {
      show(`🟢 ${n.title}`, 'success');
    } else if (n.type === 'change_request') {
      show(`📝 ${n.title}`, 'info');
    } else {
      show(`🔔 ${n.title}`, 'info');
    }
  };

  // Subscribe to realtime events — orders channel (all staff)
  useEffect(() => {
    if (authLoading || !isStaff) return;

    const ordersChannel = supabase
      .channel('orders-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as Order;
          if (toastShownRef.current.has(`order-${newOrder.id}`)) return;
          toastShownRef.current.add(`order-${newOrder.id}`);
          addNotification({
            type: 'order',
            title: `طلب جديد: ${newOrder.order_number}`,
            subtitle: newOrder.name,
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Realtime orders channel error:', status);
        }
      });

    return () => {
      supabase.removeChannel(ordersChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isStaff]);

  // Admin-only channel: mandoub profiles + change requests
  useEffect(() => {
    if (authLoading || !isAdmin) return;

    const adminChannel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mandoub_profiles' },
        (payload) => {
          const p = payload.new as { full_name: string; user_id: string };
          if (p.full_name) {
            addNotification({
              type: 'mandoub',
              title: `مندوب جديد: ${p.full_name}`,
              subtitle: 'أكمل تسجيل ملفه',
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'product_change_requests' },
        (payload) => {
          const r = payload.new as { request_type: string; product_id: string };
          addNotification({
            type: 'change_request',
            title: `طلب ${r.request_type === 'edit' ? 'تعديل' : 'حذف'} منتج بانتظار المراجعة`,
            subtitle: 'يحتاج موافقتك',
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Realtime admin channel error:', status);
        }
      });

    return () => {
      supabase.removeChannel(adminChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin]);

  // Load initial unread orders on mount
  useEffect(() => {
    if (authLoading || !isStaff || !profile) return;
    (async () => {
      const { data: viewed } = await supabase
        .from('order_views')
        .select('order_id')
        .eq('user_id', profile.id);
      const viewedIds = new Set((viewed || []).map((v: { order_id: string }) => v.order_id));

      const { data: recent } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (recent) {
        const unviewed = (recent as Order[]).filter(
          (o) => !viewedIds.has(o.id) && o.status === 'new'
        );
        if (unviewed.length > 0) {
          setNotifications((prev) => [
            ...unviewed.map((o) => ({
              id: `order-${o.id}`,
              type: 'order' as NotificationType,
              title: `طلب جديد: ${o.order_number}`,
              subtitle: o.name,
              createdAt: new Date(o.created_at).getTime(),
            })),
            ...prev,
          ]);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isStaff, profile]);

  const markOrderRead = async (orderId: string) => {
    if (!profile) return;
    setNotifications((prev) => prev.filter((n) => n.id !== `order-${orderId}`));
    await supabase
      .from('order_views')
      .upsert({ order_id: orderId, user_id: profile.id, viewed_at: new Date().toISOString() });
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAllRead = () => {
    if (!profile) return;
    const orderIds = notifications.filter((n) => n.type === 'order').map((n) => n.id.replace('order-', ''));
    setNotifications([]);
    if (orderIds.length > 0) {
      const rows = orderIds.map((id) => ({
        order_id: id,
        user_id: profile.id,
        viewed_at: new Date().toISOString(),
      }));
      supabase.from('order_views').upsert(rows);
    }
  };

  const isOrderUnread = (orderId: string) => notifications.some((n) => n.id === `order-${orderId}`);

  const value: NotificationState = {
    unreadCount: notifications.length,
    notifications,
    markAllRead,
    markRead,
    isOrderUnread,
    markOrderRead,
  };

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationState {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
