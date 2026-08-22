import { Phone, Instagram, MessageCircle, MapPin, Mail } from 'lucide-react';
import type { StoreSettings } from '@/lib/types';
import { formatPhoneDisplay } from '@/components/PhoneInput';

interface FooterProps {
  settings: StoreSettings | null;
  onNavigate: (to: string) => void;
}

export function Footer({ settings, onNavigate }: FooterProps) {
  const storeName = settings?.store_name_ar || settings?.store_name || 'شركة عراق كوين';
  const social = settings?.social_links || {};
  const whatsappClean = settings?.whatsapp_number?.replace(/[^0-9]/g, '') || '';

  return (
    <footer className="bg-cream-200 border-t border-cream-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt={storeName}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-rose-600 text-white flex items-center justify-center font-display font-bold text-lg">
                  IQ
                </div>
              )}
              <div className="font-display font-bold text-xl text-charcoal-900">{storeName}</div>
            </div>
            <p className="text-sm text-charcoal-500 leading-relaxed">
              متجر إلكتروني للعطور ومستحضرات التجميل والعناية بالبشرة والشعر.
              نوصلك إلى جميع المحافظات العراقية مع خدمة الدفع عند الاستلام.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-bold text-charcoal-800 mb-4 text-sm">روابط سريعة</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('/products')}
                  className="text-charcoal-500 hover:text-rose-600 transition"
                >
                  جميع المنتجات
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/products?filter=featured')}
                  className="text-charcoal-500 hover:text-rose-600 transition"
                >
                  المنتجات المميزة
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/products?filter=bestseller')}
                  className="text-charcoal-500 hover:text-rose-600 transition"
                >
                  الأكثر مبيعاً
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/cart')}
                  className="text-charcoal-500 hover:text-rose-600 transition"
                >
                  سلة التسوق
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-charcoal-800 mb-4 text-sm">تواصل معنا</h4>
            <ul className="space-y-3 text-sm">
              {whatsappClean && (
                <li>
                  <a
                    href={`https://wa.me/${whatsappClean}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-charcoal-500 hover:text-rose-600 transition"
                  >
                    <MessageCircle size={16} className="shrink-0 text-emerald-600" />
                    <span dir="ltr">{formatPhoneDisplay(settings?.whatsapp_number || '')}</span>
                  </a>
                </li>
              )}
              {settings?.contact_info && (
                <li className="flex items-center gap-2 text-charcoal-500">
                  <Phone size={16} className="shrink-0 text-rose-600" />
                  <span dir="ltr">{formatPhoneDisplay(settings.contact_info)}</span>
                </li>
              )}
              <li className="flex items-center gap-2 text-charcoal-500">
                <MapPin size={16} className="shrink-0 text-gold-600" />
                <span>بغداد، العراق</span>
              </li>
            </ul>
          </div>

          {/* Social + admin */}
          <div>
            <h4 className="font-bold text-charcoal-800 mb-4 text-sm">تابعنا</h4>
            <div className="flex items-center gap-3 mb-4">
              {social.instagram && (
                <a
                  href={social.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-full bg-white border border-cream-300 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center transition text-charcoal-600"
                  aria-label="انستغرام"
                >
                  <Instagram size={18} />
                </a>
              )}
              {social.tiktok && (
                <a
                  href={social.tiktok}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-full bg-white border border-cream-300 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center transition text-xs font-bold text-charcoal-600"
                  aria-label="تيك توك"
                >
                  TT
                </a>
              )}
              {social.facebook && (
                <a
                  href={social.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-full bg-white border border-cream-300 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center transition text-charcoal-600"
                  aria-label="فيسبوك"
                >
                  <Mail size={16} />
                </a>
              )}
            </div>
            <button
              onClick={() => onNavigate('/admin')}
              className="text-xs text-charcoal-400 hover:text-rose-600 transition"
            >
              لوحة الإدارة
            </button>
          </div>
        </div>

        <div className="border-t border-cream-300 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-charcoal-400">
            © {new Date().getFullYear()} {storeName} — جميع الحقوق محفوظة
          </p>
          <p className="text-xs text-charcoal-400">صُنع بكل في العراق</p>
        </div>
      </div>
    </footer>
  );
}
