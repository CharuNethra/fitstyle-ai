import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { getProduct } from '../../shared/products.js';

const STORE_KEY = 'fitstyle:store:v1';
const CONSENT_KEY = 'fitstyle:recs-consent';
const MAX_HISTORY = 20;

const emptyInteractions = { wishlist: [], cart: [], searches: [] };

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY));
    if (raw && Array.isArray(raw.cart)) {
      return {
        cart: raw.cart.filter((i) => getProduct(i.id)),
        wishlist: (raw.wishlist || []).filter((id) => getProduct(id)),
        interactions: { ...emptyInteractions, ...raw.interactions },
      };
    }
  } catch {
    // ignore corrupt storage
  }
  return { cart: [], wishlist: [], interactions: emptyInteractions };
}

const pushUnique = (list, value) => [value, ...list.filter((v) => v !== value)].slice(0, MAX_HISTORY);

function reducer(state, action) {
  const track = state.consent !== 'denied';
  switch (action.type) {
    case 'cart/add': {
      const key = `${action.id}:${action.size}`;
      const existing = state.cart.find((i) => i.key === key);
      const cart = existing
        ? state.cart.map((i) => (i.key === key ? { ...i, qty: Math.min(10, i.qty + action.qty) } : i))
        : [...state.cart, { key, id: action.id, size: action.size, qty: action.qty }];
      const interactions = track
        ? { ...state.interactions, cart: pushUnique(state.interactions.cart, action.id) }
        : state.interactions;
      return { ...state, cart, interactions };
    }
    case 'cart/qty':
      return { ...state, cart: state.cart.map((i) => (i.key === action.key ? { ...i, qty: Math.max(1, Math.min(10, action.qty)) } : i)) };
    case 'cart/remove':
      return { ...state, cart: state.cart.filter((i) => i.key !== action.key) };
    case 'cart/clear':
      return { ...state, cart: [] };
    case 'wishlist/toggle': {
      const has = state.wishlist.includes(action.id);
      const wishlist = has ? state.wishlist.filter((id) => id !== action.id) : [...state.wishlist, action.id];
      const interactions = !has && track
        ? { ...state.interactions, wishlist: pushUnique(state.interactions.wishlist, action.id) }
        : state.interactions;
      return { ...state, wishlist, interactions };
    }
    case 'search/record': {
      const q = action.query.trim().toLowerCase();
      if (!q || !track) return state;
      return { ...state, interactions: { ...state.interactions, searches: pushUnique(state.interactions.searches, q) } };
    }
    case 'consent/grant':
      return { ...state, consent: 'granted' };
    case 'consent/deny':
      return { ...state, consent: 'denied', interactions: emptyInteractions };
    case 'consent/reset':
      return { ...state, consent: null };
    default:
      return state;
  }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    ...load(),
    consent: sessionStorage.getItem(CONSENT_KEY),
  }));
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  useEffect(() => {
    const { cart, wishlist, interactions } = state;
    localStorage.setItem(STORE_KEY, JSON.stringify({ cart, wishlist, interactions }));
  }, [state]);

  useEffect(() => {
    if (state.consent) sessionStorage.setItem(CONSENT_KEY, state.consent);
    else sessionStorage.removeItem(CONSENT_KEY);
  }, [state.consent]);

  const notify = useCallback((message, tone = 'default') => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const actions = useMemo(() => ({
    addToCart: (id, size = 'M', qty = 1) => dispatch({ type: 'cart/add', id, size, qty }),
    setQty: (key, qty) => dispatch({ type: 'cart/qty', key, qty }),
    removeFromCart: (key) => dispatch({ type: 'cart/remove', key }),
    clearCart: () => dispatch({ type: 'cart/clear' }),
    toggleWishlist: (id) => dispatch({ type: 'wishlist/toggle', id }),
    recordSearch: (query) => dispatch({ type: 'search/record', query }),
    grantConsent: () => dispatch({ type: 'consent/grant' }),
    denyConsent: () => dispatch({ type: 'consent/deny' }),
    resetConsent: () => dispatch({ type: 'consent/reset' }),
  }), []);

  const cartCount = state.cart.reduce((n, i) => n + i.qty, 0);
  const subtotal = state.cart.reduce((n, i) => n + getProduct(i.id).price * i.qty, 0);

  const value = useMemo(
    () => ({ ...state, ...actions, cartCount, subtotal, toasts, notify, isWishlisted: (id) => state.wishlist.includes(id) }),
    [state, actions, cartCount, subtotal, toasts, notify],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
