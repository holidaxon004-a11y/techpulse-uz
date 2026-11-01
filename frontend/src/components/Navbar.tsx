'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Cpu,
  Heart,
  Laptop,
  Menu,
  Monitor,
  Moon,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Sun,
  Truck,
  User,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { formatUzs, Language } from '@/lib/api';

export function Navbar() {
  const {
    lang,
    setLang,
    t,
    theme,
    toggleTheme,
    cartCount,
    cartTotalUzs,
    favorites,
    user,
    openChatWithPrompt,
    toast,
  } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/catalog?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/catalog');
    }
  };

  return (
    <>
      {/* Top Info Bar */}
      <div className="bg-slate-950 text-slate-300 border-b border-slate-800/80 text-xs">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
              <Truck className="w-3.5 h-3.5" />
              O‘zbekistonning barcha 14 hududiga tezkor yetkazib berish
            </span>
            <span className="hidden md:flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Original texnika • 12–36 oy rasmiy kafolat
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/profile?tab=tracking"
              className="hover:text-cyan-400 transition-colors hidden sm:inline"
            >
              📦 Buyurtmani kuzatish
            </Link>
            <Link
              href="/admin"
              className="px-2.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/30 font-medium transition-colors"
            >
              ⚡ {t('adminPanel')}
            </Link>

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-900 rounded-md p-0.5 border border-slate-800">
              {(['uz', 'ru', 'en'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase transition-all ${
                    lang === l
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="p-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          {/* Independent Brand Logo: TECHPULSE.UZ */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-cyan-600 to-indigo-600 dark:from-white dark:via-cyan-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  TECHPULSE
                </span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                  .UZ
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase">
                AI Electronics Store
              </p>
            </div>
          </Link>

          {/* Catalog Button */}
          <Link
            href="/catalog"
            className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-cyan-600 dark:hover:bg-cyan-600 text-white font-semibold text-sm transition-colors shrink-0"
          >
            <Menu className="w-4 h-4" />
            <span>{t('catalog')}</span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-4 pr-12 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 text-white hover:opacity-95 transition-opacity flex items-center justify-center"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* AI PC Builder Highlight Button */}
            <Link
              href="/pc-builder"
              className="hidden xl:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500/15 via-indigo-500/15 to-emerald-500/15 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 hover:border-cyan-400 font-semibold text-xs transition-all"
            >
              <Wrench className="w-4 h-4 text-cyan-500" />
              <span>{t('pcBuilder')}</span>
            </Link>

            {/* AI Assistant Trigger */}
            <button
              onClick={() => openChatWithPrompt()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 hover:opacity-95 transition-all"
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">{t('aiAssistant')}</span>
            </button>

            {/* Favorites */}
            <Link
              href="/profile?tab=favorites"
              className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-cyan-500/50 transition-colors"
              title={t('favorites')}
            >
              <Heart className="w-5 h-5" />
              {favorites.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-cyan-500/50 transition-colors"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-extrabold flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-[10px] text-slate-400 leading-none">{t('cart')}</p>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatUzs(cartTotalUzs, lang)}
                </p>
              </div>
            </Link>

            {/* User Profile */}
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-cyan-500/50 transition-colors"
            >
              <User className="w-5 h-5 text-indigo-500" />
              <span className="hidden lg:inline text-xs font-semibold truncate max-w-[90px]">
                {user ? user.fullName.split(' ')[0] : t('profile')}
              </span>
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Quick Category Strip */}
        <div className="border-t border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-medium">
            <Link
              href="/pc-builder"
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 font-bold shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Gaming PC Builder
            </Link>
            <Link
              href="/catalog?category=gaming-kompyuterlar"
              className="px-3 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 transition-colors"
            >
              🎮 Gaming PK
            </Link>
            <Link
              href="/catalog?category=noutbuklar"
              className="flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 transition-colors"
            >
              <Laptop className="w-3.5 h-3.5 text-cyan-500" />
              Noutbuklar
            </Link>
            <Link
              href="/catalog?category=videokartalar"
              className="flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 transition-colors"
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-500" />
              Videokartalar (RTX 40)
            </Link>
            <Link
              href="/catalog?category=protsessorlar"
              className="px-3 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 transition-colors"
            >
              ⚡ Protsessorlar (AM5 / Intel)
            </Link>
            <Link
              href="/catalog?category=monitorlar"
              className="flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 transition-colors"
            >
              <Monitor className="w-3.5 h-3.5 text-indigo-500" />
              Monitorlar 180Hz+
            </Link>
            <Link
              href="/catalog?category=sichqonchalar"
              className="px-3 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 transition-colors"
            >
              🖱️ Gaming Aksessuarlar
            </Link>
            <Link
              href="/catalog?category=smartfonlar"
              className="px-3 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 transition-colors"
            >
              📱 Smartfonlar
            </Link>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 py-4 space-y-2">
            <Link
              href="/catalog"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 font-semibold text-sm"
            >
              📂 Barcha mahsulotlar katalogi
            </Link>
            <Link
              href="/pc-builder"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg bg-cyan-500/15 text-cyan-500 font-semibold text-sm"
            >
              🛠️ AI Gaming PC Builder
            </Link>
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg bg-indigo-500/15 text-indigo-400 font-semibold text-sm"
            >
              ⚡ Admin Dashboard
            </Link>
          </div>
        )}
      </header>

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 right-5 z-50 px-4 py-3 rounded-xl bg-slate-900/95 border border-cyan-500/50 text-white text-sm font-medium shadow-2xl shadow-cyan-500/20 flex items-center gap-2.5 animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span>{toast}</span>
        </div>
      )}
    </>
  );
}

