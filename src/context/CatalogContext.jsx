import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { PRODUCTS } from '../../shared/products.js';
import { api } from '../lib/api.js';

const CatalogContext = createContext(null);

/** Live catalogue from the API (includes admin edits); falls back to the bundled list offline. */
export function CatalogProvider({ children }) {
  const [products, setProducts] = useState(PRODUCTS);
  const [banners, setBanners] = useState([]);

  const refresh = useCallback(
    () =>
      Promise.all([api.products(), api.offers()])
        .then(([{ products: list }, offers]) => {
          setProducts(list);
          setBanners(offers.banners || []);
        })
        .catch(() => {
          // keep bundled catalogue
        }),
    [],
  );

  useEffect(() => {
    let live = true;
    Promise.all([api.products(), api.offers()])
      .then(([{ products: list }, offers]) => {
        if (!live) return;
        setProducts(list);
        setBanners(offers.banners || []);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const value = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return { products, banners, refresh, getProduct: (id) => byId.get(id) };
  }, [products, banners, refresh]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside CatalogProvider');
  return ctx;
}
