import { useEffect } from 'react';

interface SEOOptions {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

function setOrCreateMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function useSEO({ title, description, image, url, type = 'website' }: SEOOptions) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      setOrCreateMeta('description', description);
      setOrCreateMeta('og:description', description, 'property');
      setOrCreateMeta('twitter:description', description);
    }
    if (title) {
      setOrCreateMeta('og:title', title, 'property');
      setOrCreateMeta('twitter:title', title);
    }
    if (image) {
      setOrCreateMeta('og:image', image, 'property');
      setOrCreateMeta('twitter:image', image);
    }
    if (url) {
      setOrCreateMeta('og:url', url, 'property');
    }
    setOrCreateMeta('og:type', type, 'property');
  }, [title, description, image, url, type]);
}

export function getSessionId(): string {
  const KEY = 'iraq_queen_session_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
