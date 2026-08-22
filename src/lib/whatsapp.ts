import type { StoreSettings, Order } from '@/lib/types';
import { formatPhoneDisplay } from '@/components/PhoneInput';

export function buildWhatsAppUrl(number: string, message: string): string {
  const clean = number.replace(/[^0-9]/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export function buildOrderMessage(order: Order): string {
  const lines: string[] = [];
  lines.push(`طلب جديد - ${order.order_number}`);
  lines.push(`الاسم: ${order.name}`);
  lines.push(`الرقم: ${formatPhoneDisplay(order.phone)}`);
  lines.push(`المحافظة: ${order.governorate}`);
  lines.push(`العنوان: ${order.address}`);
  if (order.notes) lines.push(`ملاحظات: ${order.notes}`);
  lines.push('');
  lines.push('المنتجات:');
  if (order.order_items && order.order_items.length > 0) {
    order.order_items.forEach((it) => {
      lines.push(`• ${it.product_name} ×${it.quantity}`);
    });
  }
  lines.push('');
  lines.push(`عدد المنتجات: ${order.item_count}`);
  lines.push(`المجموع: ${order.total.toLocaleString('en-US')} د.ع`);
  return lines.join('\n');
}

export function socialLinksDefault(): Record<string, string> {
  return { instagram: '', tiktok: '', facebook: '' };
}
