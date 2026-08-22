export type ProductStatus = 'available' | 'out_of_stock' | 'draft';
export type OrderStatus = 'new' | 'processing' | 'shipped' | 'completed' | 'cancelled';
export type UserRole = 'customer' | 'admin' | 'mandoub';
export type ReviewModerationStatus = 'pending' | 'approved' | 'rejected';

export interface Category {
  id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  brand: string | null;
  price: number;
  previous_price: number | null;
  stock_qty: number;
  status: ProductStatus;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  created_at: string;
  updated_at: string;
  slug: string | null;
  created_by: string | null;
  updated_by: string | null;
  first_published_at: string | null;
  avg_rating: number;
  review_count: number;
  category?: Category | null;
  product_images?: ProductImage[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  name: string;
  phone: string;
  governorate: string;
  address: string;
  notes: string | null;
  delivery_fee: number;
  subtotal: number;
  total: number;
  item_count: number;
  status: OrderStatus;
  created_at: string;
  referred_by_mandoub_id: string | null;
  order_items?: OrderItem[];
}

export interface StoreSettings {
  id: number;
  store_name: string;
  store_name_ar: string;
  logo_url: string | null;
  whatsapp_number: string;
  delivery_fee: number;
  contact_info: string | null;
  social_links: Record<string, string>;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface MandoubPermissions {
  user_id: string;
  can_add_products: boolean;
  can_view_data: boolean;
  can_change_order_status: boolean;
}

export interface MandoubProfile {
  user_id: string;
  full_name: string;
  telegram_link: string | null;
  photo_url: string | null;
  specialty_tags: string[];
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductChangeRequest {
  id: string;
  mandoub_id: string;
  product_id: string | null;
  request_type: 'edit' | 'delete';
  proposed_changes: Record<string, unknown> | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface StaffMember {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  full_name?: string | null;
  telegram_link?: string | null;
  photo_url?: string | null;
  specialty_tags?: string[];
  onboarding_complete?: boolean;
  permissions?: MandoubPermissions | null;
}

export interface ReviewImage {
  id: string;
  review_id: string;
  url: string;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  comment: string | null;
  moderation_status: ReviewModerationStatus;
  is_verified_purchase: boolean;
  created_at: string;
  review_images?: ReviewImage[];
  user_email?: string;
}

export interface ProductAnalytics {
  views: number;
  distinct_orders: number;
  total_quantity: number;
  total_sales: number;
  published_date: string | null;
  last_view: string | null;
  last_order: string | null;
}

export interface StoreAnalytics {
  total_products: number;
  available_products: number;
  out_of_stock_products: number;
  total_orders: number;
  new_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_sales: number;
  total_views: number;
  most_viewed_product: string | null;
  most_viewed_views: number;
  most_ordered_product: string | null;
  most_ordered_qty: number;
}

export interface CustomerInfo {
  user_id: string;
  email: string;
  created_at: string;
  order_count: number;
  total_spent: number;
  last_order_date: string | null;
}
