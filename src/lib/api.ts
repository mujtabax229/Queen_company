import { supabase } from '@/lib/supabase';
import type {
  Category, Product, Order, StoreSettings, MandoubProfile, MandoubPermissions,
  ProductChangeRequest, StaffMember, Review, ReviewImage, ProductAnalytics,
  StoreAnalytics, CustomerInfo,
} from '@/lib/types';

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data as Category[];
}

export interface ProductQuery {
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  availability?: 'all' | 'available' | 'out_of_stock';
  sort?: 'newest' | 'price_asc' | 'price_desc';
  featured?: boolean;
  isNew?: boolean;
  bestseller?: boolean;
  discounted?: boolean;
  limit?: number;
}

function buildProductQuery(q: ProductQuery) {
  let query = supabase
    .from('products')
    .select('*, category:categories(*), product_images(*)')
    .neq('status', 'draft');

  if (q.search) {
    query = query.or(`name.ilike.%${q.search}%,brand.ilike.%${q.search}%`);
  }
  if (q.categoryId) query = query.eq('category_id', q.categoryId);
  if (typeof q.minPrice === 'number') query = query.gte('price', q.minPrice);
  if (typeof q.maxPrice === 'number') query = query.lte('price', q.maxPrice);
  if (q.availability === 'available') query = query.eq('status', 'available');
  if (q.availability === 'out_of_stock') query = query.eq('status', 'out_of_stock');
  if (q.featured) query = query.eq('is_featured', true);
  if (q.isNew) query = query.eq('is_new', true);
  if (q.bestseller) query = query.eq('is_bestseller', true);
  if (q.discounted) query = query.not('previous_price', 'is', null);

  switch (q.sort) {
    case 'price_asc':
      query = query.order('price', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('price', { ascending: false });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }
  if (q.limit) query = query.limit(q.limit);
  return query;
}

export async function fetchProducts(q: ProductQuery): Promise<Product[]> {
  const { data, error } = await buildProductQuery(q);
  if (error) throw error;
  return (data as Product[]) || [];
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*), product_images(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*), product_images(*)')
    .eq('slug', slug)
    .neq('status', 'draft')
    .maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

export async function fetchRelatedProducts(productId: string, categoryId: string | null): Promise<Product[]> {
  let query = supabase
    .from('products')
    .select('*, category:categories(*), product_images(*)')
    .neq('id', productId)
    .neq('status', 'draft')
    .limit(8);
  if (categoryId) {
    query = query.eq('category_id', categoryId).order('status', { ascending: true });
  } else {
    query = query.order('created_at', { ascending: false });
  }
  const { data, error } = await query;
  if (error) return [];
  const products = (data as Product[]) || [];
  const inStock = products.filter((p) => p.status === 'available');
  return inStock.length > 0 ? inStock.slice(0, 4) : products.slice(0, 4);
}

export async function fetchStoreSettings(): Promise<StoreSettings | null> {
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return data as StoreSettings | null;
}

// ---- Product view tracking ----
export async function trackProductView(productId: string, sessionId: string): Promise<void> {
  try {
    await supabase.rpc('increment_product_view', {
      p_product_id: productId,
      p_session_id: sessionId,
    });
  } catch {
    // Silent fail — view tracking should never break the page
  }
}

// ---- Checkout ----
export interface CheckoutInput {
  name: string;
  phone: string;
  governorate: string;
  address: string;
  notes?: string;
  items: { product_id: string; quantity: number }[];
  delivery_fee: number;
  customer_id?: string | null;
  referred_by_mandoub_id?: string | null;
}

export async function createOrder(
  input: CheckoutInput
): Promise<{ order: Order | null; error: string | null }> {
  const { data, error } = await supabase.rpc('create_order', {
    p_name: input.name,
    p_phone: input.phone,
    p_governorate: input.governorate,
    p_address: input.address,
    p_notes: input.notes ?? null,
    p_items: input.items,
    p_delivery_fee: input.delivery_fee,
    p_customer_id: input.customer_id ?? null,
    p_referred_by_mandoub_id: input.referred_by_mandoub_id ?? null,
  });
  if (error) return { order: null, error: error.message };
  return { order: data as Order, error: null };
}

// ---- Admin: orders ----
export async function fetchAdminOrders(
  search?: string,
  statusFilter?: string
): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }
  if (search) {
    query = query.or(
      `order_number.ilike.%${search}%,name.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data as Order[]) || [];
}

export async function updateOrderStatus(
  orderId: string,
  status: Order['status']
): Promise<void> {
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
  if (error) throw error;
}

// ---- Admin: store analytics via RPC ----
export async function fetchStoreAnalytics(range: string): Promise<StoreAnalytics | null> {
  const { data, error } = await supabase.rpc('get_store_analytics', { p_range: range });
  if (error) {
    console.error('Store analytics error:', error);
    return null;
  }
  return data as StoreAnalytics;
}

// ---- Admin: product analytics via RPC ----
export async function fetchProductAnalytics(productId: string): Promise<ProductAnalytics | null> {
  const { data, error } = await supabase.rpc('get_product_analytics', {
    p_product_id: productId,
  });
  if (error) {
    console.error('Product analytics error:', error);
    return null;
  }
  return data as ProductAnalytics;
}

// ---- Admin: customer list via RPC ----
export async function fetchCustomerList(): Promise<CustomerInfo[]> {
  const { data, error } = await supabase.rpc('get_customer_list');
  if (error) {
    console.error('Customer list error:', error);
    return [];
  }
  return (data as CustomerInfo[]) || [];
}

// ---- Admin: customer orders ----
export async function fetchCustomerOrders(customerId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data as Order[]) || [];
}

// ---- Admin: dashboard stats (legacy, kept for fallback) ----
export async function fetchDashboardStats(range: 'today' | '7d' | '30d' | 'all') {
  const [analyticsRes, ordersRes] = await Promise.all([
    fetchStoreAnalytics(range),
    supabase
      .from('orders')
      .select('id, total, status, created_at, order_number, name, item_count')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const recent = (ordersRes.data || []) as Order[];

  if (analyticsRes) {
    return {
      totalProducts: analyticsRes.total_products,
      available: analyticsRes.available_products,
      outOfStock: analyticsRes.out_of_stock_products,
      totalOrders: analyticsRes.total_orders,
      newOrders: analyticsRes.new_orders,
      totalSales: analyticsRes.total_sales,
      totalViews: analyticsRes.total_views,
      completedOrders: analyticsRes.completed_orders,
      mostViewedProduct: analyticsRes.most_viewed_product,
      mostViewedViews: analyticsRes.most_viewed_views,
      mostOrderedProduct: analyticsRes.most_ordered_product,
      mostOrderedQty: analyticsRes.most_ordered_qty,
      recent,
    };
  }

  // Fallback if RPC fails
  const [productsRes, allOrdersRes] = await Promise.all([
    supabase.from('products').select('id, status, stock_qty').neq('status', 'draft'),
    supabase.from('orders').select('id, total, status, created_at').order('created_at', { ascending: false }).limit(500),
  ]);

  const products = productsRes.data || [];
  let orders = allOrdersRes.data || [];
  const now = new Date();
  let since: Date | null = null;
  if (range === 'today') since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (range === '7d') since = new Date(now.getTime() - 7 * 86400000);
  else if (range === '30d') since = new Date(now.getTime() - 30 * 86400000);
  if (since) orders = orders.filter((o) => new Date(o.created_at) >= since);

  return {
    totalProducts: products.length,
    available: products.filter((p) => p.status === 'available').length,
    outOfStock: products.filter((p) => p.status === 'out_of_stock').length,
    totalOrders: orders.length,
    newOrders: orders.filter((o) => o.status === 'new').length,
    totalSales: orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0),
    totalViews: 0,
    completedOrders: orders.filter((o) => o.status === 'completed').length,
    mostViewedProduct: null,
    mostViewedViews: 0,
    mostOrderedProduct: null,
    mostOrderedQty: 0,
    recent,
  };
}

// ---- Reviews ----
export async function fetchApprovedReviews(productId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, review_images(*)')
    .eq('product_id', productId)
    .eq('moderation_status', 'approved')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data as Review[]) || [];
}

export async function fetchUserReview(productId: string): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, review_images(*)')
    .eq('product_id', productId)
    .maybeSingle();
  if (error) return null;
  return data as Review | null;
}

export async function submitReview(
  productId: string,
  rating: number,
  comment: string,
  images: string[]
): Promise<{ error: string | null }> {
  const { data: reviewData, error: reviewError } = await supabase
    .from('reviews')
    .insert({
      product_id: productId,
      rating,
      comment: comment || null,
    })
    .select('id')
    .maybeSingle();

  if (reviewError) {
    if (reviewError.code === '23505') return { error: 'لقد قمت بمراجعة هذا المنتج من قبل' };
    return { error: reviewError.message };
  }

  if (images.length > 0 && reviewData) {
    const inserts = images.slice(0, 3).map((url) => ({ review_id: reviewData.id, url }));
    const { error: imgError } = await supabase.from('review_images').insert(inserts);
    if (imgError) return { error: imgError.message };
  }

  return { error: null };
}

export async function fetchAdminReviews(
  search?: string,
  statusFilter?: string
): Promise<Review[]> {
  let query = supabase
    .from('reviews')
    .select('*, review_images(*)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('moderation_status', statusFilter);
  }
  const { data, error } = await query;
  if (error) throw error;
  let reviews = (data as Review[]) || [];
  if (search) {
    const lower = search.toLowerCase();
    reviews = reviews.filter(
      (r) =>
        r.comment?.toLowerCase().includes(lower) ||
        r.user_id.toLowerCase().includes(lower)
    );
  }
  return reviews;
}

export async function moderateReview(
  reviewId: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  const { error } = await supabase
    .from('reviews')
    .update({ moderation_status: status })
    .eq('id', reviewId);
  if (error) throw error;
}

export async function deleteReview(reviewId: string): Promise<void> {
  const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
  if (error) throw error;
}

// ---- Wishlist (DB for authenticated users) ----
export async function fetchWishlistProductIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('wishlists')
    .select('product_id');
  if (error) return [];
  return (data || []).map((w: { product_id: string }) => w.product_id);
}

export async function addToWishlist(productId: string): Promise<void> {
  const { error } = await supabase.from('wishlists').insert({ product_id: productId });
  if (error && error.code !== '23505') throw error;
}

export async function removeFromWishlist(productId: string): Promise<void> {
  const { error } = await supabase.from('wishlists').delete().eq('product_id', productId);
  if (error) throw error;
}

export async function fetchWishlistProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('wishlists')
    .select('product:products(*, category:categories(*), product_images(*))')
    .order('created_at', { ascending: false });
  if (error) return [];
  return ((data || []).map((w: { product: Product }) => w.product).filter(Boolean)) as Product[];
}

// ---- Mandoub profiles ----
export async function fetchMandoubProfile(userId: string): Promise<MandoubProfile | null> {
  const { data, error } = await supabase
    .from('mandoub_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as MandoubProfile | null;
}

export async function upsertMandoubProfile(profile: Partial<MandoubProfile> & { user_id: string }): Promise<void> {
  const { error } = await supabase
    .from('mandoub_profiles')
    .upsert(profile);
  if (error) throw error;
}

// ---- Mandoub permissions ----
export async function fetchMandoubPermissions(userId: string): Promise<MandoubPermissions | null> {
  const { data, error } = await supabase
    .from('mandoub_permissions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as MandoubPermissions | null;
}

// ---- Active mandoubs for checkout dropdown ----
export async function fetchActiveMandoubs(): Promise<{ id: string; full_name: string }[]> {
  const { data, error } = await supabase
    .from('mandoub_profiles')
    .select('user_id, full_name')
    .eq('onboarding_complete', true)
    .order('full_name', { ascending: true });
  if (error) return [];
  return (data || []).map((m: { user_id: string; full_name: string }) => ({ id: m.user_id, full_name: m.full_name }));
}

// ---- Product change requests ----
export async function fetchChangeRequests(): Promise<ProductChangeRequest[]> {
  const { data, error } = await supabase
    .from('product_change_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as ProductChangeRequest[]) || [];
}

export async function createChangeRequest(
  request: { product_id: string; request_type: 'edit' | 'delete'; proposed_changes: Record<string, unknown> }
): Promise<void> {
  const { error } = await supabase
    .from('product_change_requests')
    .insert({
      mandoub_id: (await supabase.auth.getUser()).data.user?.id,
      product_id: request.product_id,
      request_type: request.request_type,
      proposed_changes: request.proposed_changes,
    });
  if (error) throw error;
}

export async function approveChangeRequest(
  requestId: string,
  adminId: string
): Promise<void> {
  const { error } = await supabase
    .from('product_change_requests')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    })
    .eq('id', requestId);
  if (error) throw error;
}

export async function rejectChangeRequest(
  requestId: string,
  adminId: string,
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('product_change_requests')
    .update({
      status: 'rejected',
      admin_notes: notes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    })
    .eq('id', requestId);
  if (error) throw error;
}

// ---- Staff management via edge function ----
export async function fetchStaff(): Promise<StaffMember[]> {
  const { data, error } = await supabase.functions.invoke('staff-management', { method: 'GET' });
  if (error) throw error;
  return (data?.staff || []) as StaffMember[];
}

export async function deleteStaff(userId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('staff-management', {
    method: 'DELETE',
    body: { id: userId },
  });
  if (error) throw error;
}

export async function updateMandoubPermissions(
  userId: string,
  permissions: { can_add_products: boolean; can_view_data: boolean; can_change_order_status: boolean }
): Promise<void> {
  const { error } = await supabase
    .from('mandoub_permissions')
    .upsert({ user_id: userId, ...permissions });
  if (error) throw error;
}

// ---- Review helpers ----
export function starDistribution(reviews: Review[]): number[] {
  const dist = [0, 0, 0, 0, 0];
  for (const r of reviews) {
    if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
  }
  return dist;
}
