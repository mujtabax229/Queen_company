import { useMemo } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { ToastProvider } from '@/context/ToastContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ConfirmHost } from '@/components/ConfirmHost';
import { useRouter, matchRoute } from '@/lib/router';
import { useStoreSettings } from '@/lib/useStoreSettings';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { HomePage } from '@/pages/HomePage';
import { ProductsPage } from '@/pages/ProductsPage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { CartPage } from '@/pages/CartPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { AdminLogin } from '@/pages/admin/AdminLogin';
import { AdminShell } from '@/pages/admin/AdminShell';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminProducts } from '@/pages/admin/AdminProducts';
import { AdminCategories } from '@/pages/admin/AdminCategories';
import { AdminOrders } from '@/pages/admin/AdminOrders';
import { AdminSettings } from '@/pages/admin/AdminSettings';
import { AdminStaff } from '@/pages/admin/AdminStaff';
import { AdminMandoubs } from '@/pages/admin/AdminMandoubs';
import { AdminChangeRequests } from '@/pages/admin/AdminChangeRequests';
import { AdminPerformance } from '@/pages/admin/AdminPerformance';
import { MandoubSignup } from '@/pages/admin/MandoubSignup';
import { MandoubOnboarding } from '@/pages/admin/MandoubOnboarding';
import type { ProductQuery } from '@/lib/api';

// Routes mandoub is allowed to access (beyond dashboard)
const MANDOUB_ALLOWED = new Set(['dashboard', 'orders', 'products', 'change-requests']);

function AppRoutes() {
  const { route, navigate } = useRouter();
  const { settings } = useStoreSettings();
  const { session, isAdmin, isStaff, isMandoub, onboardingComplete, loading: authLoading } = useAuth();

  const path = route.path;
  const query = route.query;
  const filter = query.get('filter');
  const categoryId = query.get('category');
  const search = query.get('q');

  // Build product query from URL
  const productQuery: ProductQuery = useMemo(() => {
    const q: ProductQuery = {};
    if (search) q.search = search;
    if (categoryId) q.categoryId = categoryId;
    if (filter === 'featured') q.featured = true;
    if (filter === 'new') q.isNew = true;
    if (filter === 'bestseller') q.bestseller = true;
    if (filter === 'discounted') q.discounted = true;
    return q;
  }, [search, categoryId, filter]);

  // Mandoub signup route — accessible without login
  if (path === '/admin/mandoub-signup') {
    if (authLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-charcoal-400">جاري التحميل...</div>
        </div>
      );
    }
    if (session && isStaff) {
      navigate('/admin');
      return null;
    }
    return <MandoubSignup onNavigate={navigate} />;
  }

  // Admin routes
  if (path.startsWith('/admin')) {
    if (authLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-charcoal-400">جاري التحميل...</div>
        </div>
      );
    }
    if (!session || !isStaff) {
      return <AdminLogin onNavigate={navigate} />;
    }

    // Mandoub onboarding guard — redirect to onboarding if not complete
    if (isMandoub && !onboardingComplete && path !== '/admin/onboarding') {
      return <MandoubOnboarding onNavigate={navigate} />;
    }

    // Onboarding page itself
    if (path === '/admin/onboarding') {
      if (isMandoub && !onboardingComplete) {
        return <MandoubOnboarding onNavigate={navigate} />;
      }
      // Already onboarded or admin — go to dashboard
      navigate('/admin');
      return null;
    }

    let active = 'dashboard';
    if (path === '/admin' || path === '/admin/') active = 'dashboard';
    else if (path.startsWith('/admin/products')) active = 'products';
    else if (path.startsWith('/admin/categories')) active = 'categories';
    else if (path.startsWith('/admin/orders')) active = 'orders';
    else if (path.startsWith('/admin/staff')) active = 'staff';
    else if (path.startsWith('/admin/mandoubs')) active = 'mandoubs';
    else if (path.startsWith('/admin/change-requests')) active = 'change-requests';
    else if (path.startsWith('/admin/performance')) active = 'performance';
    else if (path.startsWith('/admin/settings')) active = 'settings';

    // Mandoub route guard — redirect to dashboard if trying to access restricted pages
    if (!isAdmin && !MANDOUB_ALLOWED.has(active)) {
      return (
        <AdminShell active="dashboard" onNavigate={navigate}>
          <div className="max-w-md mx-auto text-center py-16">
            <h1 className="text-xl font-display font-bold text-charcoal-800 mb-2">
              لا تملك صلاحية الوصول
            </h1>
            <p className="text-charcoal-500 text-sm mb-4">
              هذه الصفحة متاحة للمدير فقط
            </p>
            <button onClick={() => navigate('/admin')} className="btn-primary">
              العودة للوحة المندوب
            </button>
          </div>
        </AdminShell>
      );
    }

    let content;
    if (path === '/admin' || path === '/admin/') content = <AdminDashboard onNavigate={navigate} />;
    else if (path.startsWith('/admin/products')) content = <AdminProducts />;
    else if (path.startsWith('/admin/categories') && isAdmin) content = <AdminCategories />;
    else if (path.startsWith('/admin/orders')) content = <AdminOrders />;
    else if (path.startsWith('/admin/staff') && isAdmin) content = <AdminStaff />;
    else if (path.startsWith('/admin/mandoubs') && isAdmin) content = <AdminMandoubs onNavigate={navigate} />;
    else if (path.startsWith('/admin/change-requests') && isAdmin) content = <AdminChangeRequests />;
    else if (path.startsWith('/admin/performance') && isAdmin) content = <AdminPerformance />;
    else if (path.startsWith('/admin/settings') && isAdmin) content = <AdminSettings />;
    else content = <AdminDashboard onNavigate={navigate} />;

    return (
      <AdminShell active={active} onNavigate={navigate}>
        {content}
      </AdminShell>
    );
  }

  // Storefront routes
  const onSearch = (q: string) => navigate(`/products?q=${encodeURIComponent(q)}`);

  // Product detail
  const productMatch = matchRoute(path, '/product/:id');

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        settings={settings}
        onNavigate={navigate}
        onSearch={onSearch}
        currentPath={path}
      />
      <main className="flex-1">
        {path === '/' && <HomePage settings={settings} onNavigate={navigate} />}
        {path === '/products' && (
          <ProductsPage initialQuery={productQuery} onNavigate={navigate} />
        )}
        {productMatch && (
          <ProductDetailPage productId={productMatch.id} onNavigate={navigate} />
        )}
        {path === '/cart' && <CartPage onNavigate={navigate} />}
        {path === '/checkout' && <CheckoutPage onNavigate={navigate} />}
        {!isStorefrontRoute(path) && !productMatch && (
          <div className="max-w-3xl mx-auto px-4 py-16 text-center">
            <h1 className="text-2xl font-display font-bold text-charcoal-800 mb-2">
              الصفحة غير موجودة
            </h1>
            <p className="text-charcoal-500 mb-4">عذراً، هذه الصفحة غير متوفرة</p>
            <button onClick={() => navigate('/')} className="btn-primary">
              العودة للرئيسية
            </button>
          </div>
        )}
      </main>
      <Footer settings={settings} onNavigate={navigate} />
    </div>
  );
}

function isStorefrontRoute(path: string): boolean {
  return path === '/' || path === '/products' || path === '/cart' || path === '/checkout';
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
          <NotificationProvider>
            <AppRoutes />
            <ConfirmHost />
          </NotificationProvider>
        </CartProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
