import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, TOKEN_KEY } from '../lib/api.js';

const USER_KEY = 'fitstyle:user';
const GUEST_KEY = 'fitstyle:guest';

const AuthContext = createContext(null);

const readUser = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) ? JSON.parse(localStorage.getItem(USER_KEY)) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);
  const [guest, setGuest] = useState(() => localStorage.getItem(GUEST_KEY) === '1');
  // { reason } while the login modal is open; first-time visitors get the welcome prompt.
  const [prompt, setPrompt] = useState(() =>
    !readUser() && localStorage.getItem(GUEST_KEY) !== '1' && !/^\/(admin|reset-password)/.test(window.location.pathname) ? { reason: null } : null,
  );
  const pending = useRef(null);

  const saveUser = useCallback((u, token) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    try {
      const { user: u } = await api.me();
      saveUser(u);
    } catch {
      clear();
    }
  }, [saveUser, clear]);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api.me().then(({ user: u }) => saveUser(u)).catch(clear);
  }, [saveUser, clear]);

  const finish = useCallback((u, token) => {
    saveUser(u, token);
    localStorage.removeItem(GUEST_KEY);
    setGuest(false);
    setPrompt(null);
    const next = pending.current;
    pending.current = null;
    next?.();
  }, [saveUser]);

  const value = useMemo(() => ({
    user,
    guest,
    prompt,
    login: async (email, password) => {
      const res = await api.login({ email, password });
      finish(res.user, res.token);
    },
    signup: async (name, email, password) => {
      const res = await api.signup({ name, email, password });
      finish(res.user, res.token);
    },
    logout: async () => {
      try {
        await api.logout();
      } catch {
        // already signed out on the server
      }
      clear();
    },
    continueAsGuest: () => {
      localStorage.setItem(GUEST_KEY, '1');
      setGuest(true);
      setPrompt(null);
      pending.current = null;
    },
    openAuth: (reason = null) => setPrompt({ reason }),
    closeAuth: () => {
      setPrompt(null);
      pending.current = null;
    },
    /** Runs `action` now if logged in, otherwise after a successful login/signup. */
    requireAuth: (action, reason) => {
      if (user) return action();
      pending.current = action;
      setPrompt({ reason });
      return undefined;
    },
    setWallet: (wallet) => saveUser({ ...user, wallet }),
    refreshUser,
  }), [user, guest, prompt, finish, clear, saveUser, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
