'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language, UI_TEXT } from '@/lib/api';

export interface CartItem {
  id: string;
  slug: string;
  nameUz: string;
  nameRu?: string;
  nameEn?: string;
  priceUzs: number;
  imageUrl: string;
  brandName?: string;
  stockQuantity: number;
  quantity: number;
}

export interface UserProfile {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  language?: string;
  role: string;
}

export interface AdminProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  permissions: string[];
}

interface StoreContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  addMultipleToCart: (items: Array<Omit<CartItem, 'quantity'>>) => void;
  updateQuantity: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  cartTotalUzs: number;
  cartCount: number;
  favorites: CartItem[];
  toggleFavorite: (item: Omit<CartItem, 'quantity'>) => void;
  isFavorite: (id: string) => boolean;
  user: UserProfile | null;
  userToken: string | null;
  setUserSession: (user: UserProfile | null, token: string | null) => void;
  admin: AdminProfile | null;
  adminToken: string | null;
  setAdminSession: (admin: AdminProfile | null, token: string | null) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  chatInitialPrompt: string;
  openChatWithPrompt: (prompt?: string) => void;
  toast: string | null;
  showToast: (msg: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('uz');
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<CartItem[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('tp_lang') as Language | null;
      if (savedLang && ['uz', 'ru', 'en'].includes(savedLang)) setLangState(savedLang);

      const savedTheme = localStorage.getItem('tp_theme') as 'dark' | 'light' | null;
      const initialTheme = savedTheme || 'dark';
      setThemeState(initialTheme);
      document.documentElement.classList.toggle('dark', initialTheme === 'dark');

      const savedCart = localStorage.getItem('tp_cart');
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedFavs = localStorage.getItem('tp_favs');
      if (savedFavs) setFavorites(JSON.parse(savedFavs));

      const savedUser = localStorage.getItem('tp_user');
      const savedUserToken = localStorage.getItem('tp_user_token');
      if (savedUser && savedUserToken) {
        setUser(JSON.parse(savedUser));
        setUserToken(savedUserToken);
      }

      const savedAdmin = localStorage.getItem('tp_admin');
      const savedAdminToken = localStorage.getItem('tp_admin_token');
      if (savedAdmin && savedAdminToken) {
        setAdmin(JSON.parse(savedAdmin));
        setAdminToken(savedAdminToken);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem('tp_lang', l);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    localStorage.setItem('tp_theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const saveCart = (next: CartItem[]) => {
    setCart(next);
    localStorage.setItem('tp_cart', JSON.stringify(next));
  };

  const addToCart = (item: Omit<CartItem, 'quantity'>, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      let next: CartItem[];
      if (existing) {
        const newQty = Math.min(item.stockQuantity || 99, existing.quantity + qty);
        next = prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i));
      } else {
        next = [...prev, { ...item, quantity: qty }];
      }
      localStorage.setItem('tp_cart', JSON.stringify(next));
      return next;
    });
    showToast(`"${item.nameUz.slice(0, 38)}..." savatga qo‘shildi!`);
  };

  const addMultipleToCart = (items: Array<Omit<CartItem, 'quantity'>>) => {
    setCart((prev) => {
      const map = new Map<string, CartItem>();
      for (const p of prev) map.set(p.id, { ...p });
      for (const item of items) {
        const existing = map.get(item.id);
        if (existing) {
          existing.quantity = Math.min(item.stockQuantity || 99, existing.quantity + 1);
        } else {
          map.set(item.id, { ...item, quantity: 1 });
        }
      }
      const next = Array.from(map.values());
      localStorage.setItem('tp_cart', JSON.stringify(next));
      return next;
    });
    showToast(`${items.length} ta komponent savatga muvaffaqiyatli qo‘shildi!`);
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(id);
      return;
    }
    const next = cart.map((i) =>
      i.id === id ? { ...i, quantity: Math.min(i.stockQuantity || 99, qty) } : i,
    );
    saveCart(next);
  };

  const removeFromCart = (id: string) => {
    saveCart(cart.filter((i) => i.id !== id));
  };

  const clearCart = () => {
    saveCart([]);
  };

  const toggleFavorite = (item: Omit<CartItem, 'quantity'>) => {
    const exists = favorites.some((f) => f.id === item.id);
    const next = exists
      ? favorites.filter((f) => f.id !== item.id)
      : [...favorites, { ...item, quantity: 1 }];
    setFavorites(next);
    localStorage.setItem('tp_favs', JSON.stringify(next));
    showToast(exists ? 'Sevimlilardan olib tashlandi' : 'Sevimlilarga qo‘shildi ❤️');
  };

  const isFavorite = (id: string) => favorites.some((f) => f.id === id);

  const setUserSession = (u: UserProfile | null, token: string | null) => {
    setUser(u);
    setUserToken(token);
    if (u && token) {
      localStorage.setItem('tp_user', JSON.stringify(u));
      localStorage.setItem('tp_user_token', token);
    } else {
      localStorage.removeItem('tp_user');
      localStorage.removeItem('tp_user_token');
    }
  };

  const setAdminSession = (a: AdminProfile | null, token: string | null) => {
    setAdmin(a);
    setAdminToken(token);
    if (a && token) {
      localStorage.setItem('tp_admin', JSON.stringify(a));
      localStorage.setItem('tp_admin_token', token);
    } else {
      localStorage.removeItem('tp_admin');
      localStorage.removeItem('tp_admin_token');
    }
  };

  const openChatWithPrompt = (prompt = '') => {
    if (prompt) setChatInitialPrompt(prompt);
    setIsChatOpen(true);
  };

  const cartTotalUzs = cart.reduce((sum, i) => sum + i.priceUzs * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const t = (key: string) => UI_TEXT[lang]?.[key] || UI_TEXT.uz[key] || key;

  return (
    <StoreContext.Provider
      value={{
        lang,
        setLang,
        t,
        theme,
        toggleTheme,
        cart,
        addToCart,
        addMultipleToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartTotalUzs,
        cartCount,
        favorites,
        toggleFavorite,
        isFavorite,
        user,
        userToken,
        setUserSession,
        admin,
        adminToken,
        setAdminSession,
        isChatOpen,
        setIsChatOpen,
        chatInitialPrompt,
        openChatWithPrompt,
        toast,
        showToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

