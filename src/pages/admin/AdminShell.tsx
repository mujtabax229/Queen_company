import { type ReactNode, useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Package, Tag, ShoppingCart, Settings, LogOut, Store, Bell, Users, FileEdit, BarChart3 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';

interface AdminShellProps {
  active: string;
  onNavigate: (to: string) => void;
  children: ReactNode;
}

export function AdminShell({ active, onNavigate, children }: AdminShellProps) {
  const { profile, signOut, isAdmin, permissions } = useAuth();
  const { unreadCount, notifications, markAllRead } = useNotifications();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await signOut();
    onNavigate('/');
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    if (bellOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bellOpen]);

  const canAddProducts = isAdmin || permissions?.can_add_products || false;
  const canViewData = isAdmin || permissions?.can_view_data || false;

  const navItems = [
    { key: 'dashboard', label: 'الرئيسية', path: '/admin', icon: LayoutDashboard },
    ...(canAddProducts || isAdmin
      ? [{ key: 'products', label: 'المنتجات', path: '/admin/products', icon: Package }]
      : []),
    ...(isAdmin
      ? [{ key: 'categories', label: 'الفئات', path: '/admin/categories', icon: Tag }]
      : []),
    { key: 'orders', label: 'الطلبات', path: '/admin/orders', icon: ShoppingCart },
    ...(isAdmin
      ? [
          { key: 'mandoubs', label: 'المندوبون', path: '/admin/mandoubs', icon: Users },
          { key: 'change-requests', label: 'طلبات التعديل', path: '/admin/change-requests', icon: FileEdit },
          { key: 'performance', label: 'الأداء', path: '/admin/performance', icon: BarChart3 },
        ]
      : []),
    ...(isAdmin ? [{ key: 'settings', label: 'الإعدادات', path: '/admin/settings', icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-60 bg-charcoal-900 text-cream-100 lg:min-h-screen flex lg:flex-col shrink-0">
        <div className="p-4 border-b border-charcoal-700 hidden lg:block">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center font-display font-bold">
              IQ
            </div>
            <div>
              <div className="font-display font-bold text-sm text-white">Iraq Queen</div>
              <div className="text-[10px] text-cream-200/60">
                {isAdmin ? 'لوحة الإدارة' : 'لوحة المندوب'}
              </div>
            </div>
          </div>
        </div>

        <nav className="flex lg:flex-col gap-1 p-2 lg:p-3 overflow-x-auto no-scrollbar flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.path)}
                className={`relative flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition shrink-0 ${
                  isActive
                    ? 'bg-rose-600 text-white'
                    : 'text-cream-200/80 hover:bg-charcoal-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span className="whitespace-nowrap">{item.label}</span>
                {item.key === 'orders' && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -left-0.5 lg:left-auto lg:-right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-scaleIn">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-charcoal-700 hidden lg:block">
          <div className="text-xs text-cream-200/60 mb-2 truncate">{profile?.email}</div>
          <div className="flex gap-1">
            <button
              onClick={() => onNavigate('/')}
              className="flex-1 flex items-center justify-center gap-1 text-xs text-cream-200/70 hover:text-white py-2 rounded-lg hover:bg-charcoal-800"
            >
              <Store size={14} /> المتجر
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 flex items-center justify-center gap-1 text-xs text-rose-300 hover:text-rose-200 py-2 rounded-lg hover:bg-charcoal-800"
            >
              <LogOut size={14} /> خروج
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between bg-charcoal-900 text-white px-4 py-2">
          <span className="font-bold text-sm">{navItems.find((n) => n.key === active)?.label}</span>
          <div className="flex items-center gap-3">
            <div ref={bellRef} className="relative">
              <button onClick={() => setBellOpen(!bellOpen)} className="relative text-cream-200">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <BellDropdown
                  notifications={notifications}
                  onNavigateAll={() => {
                    setBellOpen(false);
                    onNavigate('/admin/orders');
                  }}
                  onNavigateTo={(type) => {
                    setBellOpen(false);
                    if (type === 'mandoub') onNavigate('/admin/mandoubs');
                    else if (type === 'change_request') onNavigate('/admin/change-requests');
                    else onNavigate('/admin/orders');
                  }}
                  onMarkAllRead={() => markAllRead()}
                />
              )}
            </div>
            <button onClick={handleSignOut} className="text-rose-300">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Desktop bell */}
        <div className="hidden lg:flex justify-end px-6 pt-4">
          <div ref={bellRef} className="relative">
            <button
              onClick={() => setBellOpen(!bellOpen)}
              className="relative w-10 h-10 rounded-xl bg-white border border-cream-200 flex items-center justify-center text-charcoal-600 hover:border-rose-300 hover:text-rose-600 transition"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-scaleIn">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {bellOpen && (
              <BellDropdown
                notifications={notifications}
                onNavigateAll={() => {
                  setBellOpen(false);
                  onNavigate('/admin/orders');
                }}
                onNavigateTo={(type) => {
                  setBellOpen(false);
                  if (type === 'mandoub') onNavigate('/admin/mandoubs');
                  else if (type === 'change_request') onNavigate('/admin/change-requests');
                  else onNavigate('/admin/orders');
                }}
                onMarkAllRead={() => markAllRead()}
              />
            )}
          </div>
        </div>

        <div className="p-4 md:p-6 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

interface BellNotification {
  id: string;
  type: 'order' | 'mandoub' | 'change_request';
  title: string;
  subtitle?: string;
}

function BellDropdown({
  notifications,
  onNavigateAll,
  onNavigateTo,
  onMarkAllRead,
}: {
  notifications: BellNotification[];
  onNavigateAll: () => void;
  onNavigateTo: (type: BellNotification['type']) => void;
  onMarkAllRead: () => void;
}) {
  const dotColor = (type: BellNotification['type']) => {
    if (type === 'mandoub') return 'bg-emerald-500';
    if (type === 'change_request') return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="absolute left-0 lg:left-auto lg:right-0 top-full mt-2 w-72 card shadow-xl overflow-hidden z-50 animate-scaleIn">
      <div className="flex items-center justify-between px-4 py-3 border-b border-cream-200">
        <span className="font-bold text-sm">الإشعارات</span>
        {notifications.length > 0 && (
          <button onClick={onMarkAllRead} className="text-xs text-rose-600 font-bold hover:underline">
            تعليم الكل كمقروء
          </button>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-charcoal-400">لا توجد إشعارات جديدة</div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => onNavigateTo(n.type)}
              className="w-full flex items-center gap-2 px-4 py-3 text-right border-b border-cream-100 last:border-0 hover:bg-cream-50 transition"
            >
              <div className={`w-2 h-2 rounded-full ${dotColor(n.type)} shrink-0`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-charcoal-800 truncate">{n.title}</p>
                {n.subtitle && <p className="text-xs text-charcoal-400 truncate">{n.subtitle}</p>}
              </div>
            </button>
          ))
        )}
      </div>
      {notifications.length > 0 && (
        <button
          onClick={onNavigateAll}
          className="w-full text-center py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition border-t border-cream-200"
        >
          عرض الكل
        </button>
      )}
    </div>
  );
}
