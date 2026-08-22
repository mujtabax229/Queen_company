import { useEffect, useState, useCallback } from 'react';

export interface Route {
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
}

function parseHash(): Route {
  const raw = window.location.hash.slice(1) || '/';
  const [pathPart, queryPart] = raw.split('?');
  const path = pathPart || '/';
  const query = new URLSearchParams(queryPart || '');
  return { path, params: {}, query };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((to: string) => {
    if (!to.startsWith('#')) to = '#' + (to.startsWith('/') ? to : '/' + to);
    if (window.location.hash === to) {
      window.scrollTo(0, 0);
      return;
    }
    window.location.hash = to;
  }, []);

  return { route, navigate };
}

export function matchRoute(
  path: string,
  pattern: string
): Record<string, string> | null {
  const pSeg = path.split('/').filter(Boolean);
  const tSeg = pattern.split('/').filter(Boolean);
  if (pSeg.length !== tSeg.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < tSeg.length; i++) {
    if (tSeg[i].startsWith(':')) {
      params[tSeg[i].slice(1)] = decodeURIComponent(pSeg[i]);
    } else if (tSeg[i] !== pSeg[i]) {
      return null;
    }
  }
  return params;
}
