import { useEffect } from 'react';

const BASE = 'ResoMD';

/**
 * Set the document title. Pass a page name to get "Page · ResoMD",
 * or pass nothing to reset to just "ResoMD".
 */
export function useDocumentTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `${page} · ${BASE}` : BASE;
    return () => {
      document.title = BASE;
    };
  }, [page]);
}
