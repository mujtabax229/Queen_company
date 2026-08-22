import { Search, ShoppingBag, Menu, X, User, Home, Tag } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import type { StoreSettings } from '@/lib/types';

interface HeaderProps {
  settings: StoreSettings | null;
  onNavigate: (to: string) => void;
  onSearch: (q: string) => void;
  currentPath: string;
}

export function Header({ settings, onNavigate, onSearch, currentPath }: HeaderProps) {
  const { count } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState('');

  const storeName = settings?.store_name_ar || settings?.store_name || 'شركة عراق كوين';

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(q);
    setSearchOpen(false);
    setQ('');
  };

  const go = (to: string) => {
    onNavigate(to);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-cream-50/95 backdrop-blur-md border-b border-cream-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Mobile menu button */}
          <button
            className="lg:hidden btn-ghost p-2 -mr-2"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="القائمة"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Logo */}
          <button
            onClick={() => go('/')}
            className="flex items-center gap-2 shrink-0"
          >
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={storeName}
                className="h-10 w-10 rounded-full object-cover border border-gold-300"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-rose-600 text-white flex items-center justify-center font-display font-bold text-lg shadow-sm">
                IQ
              </div>
            )}
            <div className="hidden sm:block text-right leading-tight">
              <div className="font-display font-bold text-charcoal-900 text-base">{storeName}</div>
              <div className="text-[10px] text-gold-600 font-bold tracking-wide">IRAQ QUEEN</div>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-bold text-charcoal-600">
            <button
              onClick={() => go('/')}
              className={`px-3 py-2 rounded-lg hover:bg-cream-100 ${currentPath === '/' ? 'text-rose-700' : ''}`}
            >
              الرئيسية
            </button>
            <button
              onClick={() => go('/products')}
              className={`px-3 py-2 rounded-lg hover:bg-cream-100 ${currentPath.startsWith('/products') ? 'text-rose-700' : ''}`}
            >
              جميع المنتجات
            </button>
            <button
              onClick={() => go('/products?filter=featured')}
              className="px-3 py-2 rounded-lg hover:bg-cream-100"
            >
              المميزة
            </button>
            <button
              onClick={() => go('/products?filter=new')}
              className="px-3 py-2 rounded-lg hover:bg-cream-100"
            >
              الجديد
            </button>
            <button
              onClick={() => go('/products?filter=bestseller')}
              className="px-3 py-2 rounded-lg hover:bg-cream-100"
            >
              الأكثر مبيعاً
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              className="btn-ghost p-2"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="بحث"
            >
              <Search size={20} />
            </button>
            <button
              className="btn-ghost p-2 relative"
              onClick={() => go('/cart')}
              aria-label="السلة"
            >
              <ShoppingBag size={20} />
              {count > 0 && (
                <span className="absolute -top-0.5 -left-0.5 bg-rose-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {count}
                </span>
              )}
            </button>
            <button
              className="btn-ghost p-2 hidden sm:flex"
              onClick={() => go('/admin')}
              aria-label="لوحة الإدارة"
              title="لوحة الإدارة"
            >
              <User size={20} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <form onSubmit={submitSearch} className="pb-3 animate-fadeIn">
            <div className="relative">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-300" />
              <input
                autoFocus
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث عن منتج، علامة تجارية..."
                className="input pr-10"
              />
            </div>
          </form>
        )}

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="lg:hidden pb-3 flex flex-col gap-1 animate-fadeIn">
            <MobileLink icon={<Home size={18} />} label="الرئيسية" onClick={() => go('/')} />
            <MobileLink icon={<Tag size={18} />} label="جميع المنتجات" onClick={() => go('/products')} />
            <MobileLink label="المنتجات المميزة" onClick={() => go('/products?filter=featured')} />
            <MobileLink label="المنتجات الجديدة" onClick={() => go('/products?filter=new')} />
            <MobileLink label="الأكثر مبيعاً" onClick={() => go('/products?filter=bestseller')} />
            <MobileLink icon={<User size={18} />} label="لوحة الإدارة" onClick={() => go('/admin')} />
          </nav>
        )}
      </div>
    </header>
  );
}

function MobileLink({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-charcoal-700 hover:bg-cream-100 text-right"
    >
      {icon}
      {label}
    </button>
  );
}
