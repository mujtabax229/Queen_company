import type { Product } from './types';

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartLine {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  stock: number;
}

export function formatIQD(amount: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(amount)) + ' د.ع';
}

export function discountPercent(price: number, previousPrice: number | null): number | null {
  if (!previousPrice || previousPrice <= price) return null;
  return Math.round(((previousPrice - price) / previousPrice) * 100);
}

export function primaryImage(product: Product): string | null {
  if (!product.product_images || product.product_images.length === 0) return null;
  const primary = product.product_images.find((i) => i.is_primary);
  return (primary || product.product_images[0]).url;
}

export function renderStars(rating: number, size: number = 16): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return '★'.repeat(full) + (half ? '☆' : '') + '☆'.repeat(Math.max(0, empty));
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHr < 24) return `منذ ${diffHr} ساعة`;
  if (diffDay < 30) return `منذ ${diffDay} يوم`;
  return date.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function governorates(): string[] {
  return [
    'بغداد',
    'البصرة',
    'نينوى',
    'أربيل',
    'النجف',
    'كربلاء',
    'كركوك',
    'الأنبار',
    'ديالى',
    'ذي قار',
    'ميسان',
    'المثنى',
    'القادسية',
    'بابل',
    'واسط',
    'صلاح الدين',
    'دهوك',
    'السليمانية',
  ];
}
