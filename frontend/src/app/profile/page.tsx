'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  CheckCircle2,
  Heart,
  LogOut,
  MapPin,
  Package,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  User,
} from 'lucide-react';
import { API_BASE, formatUzs } from '@/lib/api';
import { useStore } from '@/context/StoreContext';

function ProfileContent() {
  const searchParams = useSearchParams();
  const {
    lang,
    user,
    userToken,
    setUserSession,
    favorites,
    toggleFavorite,
    addToCart,
    showToast,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'orders' | 'favorites' | 'addresses' | 'tracking'>(
    (searchParams.get('tab') as any) || 'orders',
  );

  // Auth form state (qo'lda kiritiladi — Chrome autofill bloklangan)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [authInputsReady, setAuthInputsReady] = useState(false);
  const [authError, setAuthError] = useState('');

  // Profile backend data
  const [profileData, setProfileData] = useState<any>(null);

  // New Address state
  const [addrTitle, setAddrTitle] = useState('Uy manzilim');
  const [addrRegion, setAddrRegion] = useState('Toshkent shahri');
  const [addrDistrict, setAddrDistrict] = useState('Yunusobod');
  const [addrStreet, setAddrStreet] = useState('');

  // Order Tracking state
  const [trackCode, setTrackCode] = useState(searchParams.get('order') || '');
  const [trackedOrder, setTrackedOrder] = useState<any>(null);
  const [trackError, setTrackError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['orders', 'favorites', 'addresses', 'tracking'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
    const ordParam = searchParams.get('order');
    if (ordParam) {
      setTrackCode(ordParam);
      handleTrackOrder(ordParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (userToken) {
      fetchProfile(userToken);
      const timer = setInterval(() => {
        fetchProfile(userToken);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [userToken]);

  const handleCancelOrder = async (orderIdOrNumber: string) => {
    setCancellingId(orderIdOrNumber);
    try {
      const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderIdOrNumber)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Mijoz shaxsiy kabinetdan bekor qildi',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Buyurtma #${data.orderNumber} bekor qilindi (CANCELLED) va Admin panelga xabar yuborildi!`);
        if (userToken) fetchProfile(userToken);
        if (trackedOrder && (trackedOrder.id === orderIdOrNumber || trackedOrder.orderNumber === orderIdOrNumber)) {
          handleTrackOrder(data.orderNumber);
        }
      } else {
        showToast(data.message || 'Buyurtmani bekor qilishda xatolik');
      }
    } finally {
      setCancellingId(null);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? 'login' : 'register';
    try {
      const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone,
          password,
          language: lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.message || 'Avtorizatsiya xatosi');
      } else {
        setUserSession(data.user, data.accessToken);
        fetchProfile(data.accessToken);
        showToast(`Xush kelibsiz, ${data.user.fullName}!`);
      }
    } catch {
      setAuthError('Server bilan aloqa xatosi');
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToken || !addrStreet.trim()) return;
    const res = await fetch(`${API_BASE}/auth/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        title: addrTitle,
        region: addrRegion,
        district: addrDistrict,
        street: addrStreet,
        isDefault: true,
      }),
    });
    if (res.ok) {
      setAddrStreet('');
      fetchProfile(userToken);
      showToast('Manzil saqlandi!');
    }
  };

  const handleTrackOrder = async (codeOverride?: string) => {
    const code = (codeOverride ?? trackCode).trim();
    if (!code) return;
    setTrackError('');
    try {
      const res = await fetch(`${API_BASE}/orders/track/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) {
        setTrackError(data.message || 'Buyurtma topilmadi');
        setTrackedOrder(null);
      } else {
        setTrackedOrder(data);
      }
    } catch {
      setTrackError('Buyurtmani tekshirishda xatolik');
    }
  };

  const statusSteps = ['NEW', 'CONFIRMED', 'PREPARING', 'SHIPPING', 'DELIVERED'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            👤 Shaxsiy Kabinet va Buyurtmalar Kuzatuvi
          </h1>
          <p className="text-xs text-slate-500">
            Buyurtmalar tarixi, sevimli mahsulotlar, saqlangan manzillar va tezkor kuzatuv
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'orders', label: '📦 Buyurtmalarim', icon: Package },
            { id: 'tracking', label: '🚚 Buyurtmani kuzatish', icon: Truck },
            { id: 'favorites', label: `❤️ Sevimlilar (${favorites.length})`, icon: Heart },
            { id: 'addresses', label: '📍 Manzillarim', icon: MapPin },
          ].map((tb) => (
            <button
              key={tb.id}
              onClick={() => setActiveTab(tb.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === tb.id
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {/* ORDER TRACKING TAB (works even without login) */}
      {activeTab === 'tracking' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="max-w-xl space-y-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              🚚 Buyurtma holatini raqam bo‘yicha tekshirish
            </h2>
            <p className="text-xs text-slate-500">
              Buyurtma raqamingizni kiriting (masalan, demo buyurtma: <code className="text-cyan-500 font-bold">TP-2026-1001</code>)
            </p>
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={trackCode}
                onChange={(e) => setTrackCode(e.target.value)}
                placeholder="TP-2026-1001"
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-bold uppercase"
              />
              <button
                onClick={() => handleTrackOrder()}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5"
              >
                <Search className="w-4 h-4" />
                <span>Tekshirish</span>
              </button>
            </div>
            {trackError && <p className="text-xs text-rose-500 font-bold">{trackError}</p>}
          </div>

          {trackedOrder && (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-cyan-500">
                    Kuzatuv kodi: {trackedOrder.trackingCode}
                  </span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Buyurtma #{trackedOrder.orderNumber} — {trackedOrder.customerName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Manzil: {trackedOrder.region}, {trackedOrder.district}, {trackedOrder.address}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Umumiy summa:</p>
                  <p className="text-xl font-black text-emerald-500">
                    {formatUzs(trackedOrder.totalUzs, lang)}
                  </p>
                </div>
              </div>

              {/* Progress Steps or Cancelled Banner */}
              {trackedOrder.status === 'CANCELLED' ? (
                <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-500 text-xs font-extrabold flex items-center justify-between">
                  <span>❌ Ushbu buyurtma bekor qilingan (CANCELLED). Mahsulotlar omborga qaytarilgan.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {statusSteps.map((step, i) => {
                      const curIdx = statusSteps.indexOf(trackedOrder.status);
                      const active = curIdx >= i;
                      const labels: Record<string, string> = {
                        NEW: '1. Yangi',
                        CONFIRMED: '2. Tasdiqlandi',
                        PREPARING: '3. Tayyorlanmoqda',
                        SHIPPING: '4. Yo‘lda',
                        DELIVERED: '5. Yetkazildi',
                      };
                      return (
                        <div
                          key={step}
                          className={`p-3 rounded-xl border text-center text-xs font-extrabold ${
                            active
                              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                          }`}
                        >
                          {labels[step]}
                        </div>
                      );
                    })}
                  </div>

                  {trackedOrder.status !== 'DELIVERED' && (
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => handleCancelOrder(trackedOrder.orderNumber)}
                        disabled={cancellingId === trackedOrder.orderNumber}
                        className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-500 font-extrabold text-xs transition-all"
                      >
                        {cancellingId === trackedOrder.orderNumber
                          ? 'Bekor qilinmoqda...'
                          : '❌ Buyurtmani bekor qilish'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FAVORITES TAB */}
      {activeTab === 'favorites' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            ❤️ Sevimli mahsulotlarim ({favorites.length})
          </h2>
          {favorites.length === 0 ? (
            <p className="text-xs text-slate-500">Sevimlilar ro‘yxati hozircha bo‘sh.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.nameUz}
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/product/${item.slug}`}
                      className="text-xs font-bold text-slate-900 dark:text-white hover:text-cyan-400 line-clamp-2"
                    >
                      {item.nameUz}
                    </Link>
                    <p className="text-xs font-black text-cyan-500 mt-1">
                      {formatUzs(item.priceUzs, lang)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => addToCart(item, 1)}
                      className="p-2 rounded-lg bg-cyan-500 text-slate-950"
                      title="Savatga"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleFavorite(item)}
                      className="p-2 rounded-lg bg-rose-500/15 text-rose-500"
                      title="O‘chirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ORDERS & ADDRESSES REQUIRE USER AUTH */}
      {(activeTab === 'orders' || activeTab === 'addresses') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: User Card or Login Form */}
          <div className="lg:col-span-4">
            {!user ? (
              <form
                onSubmit={handleAuth}
                autoComplete="off"
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
              >
                <input type="text" name="fake_user_trap" className="hidden" tabIndex={-1} autoComplete="off" />
                <input type="password" name="fake_pass_trap" className="hidden" tabIndex={-1} autoComplete="new-password" />

                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    📱 Telefon orqali kirish
                  </h2>
                  <button
                    type="button"
                    onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                    className="text-xs font-bold text-cyan-500 hover:underline"
                  >
                    {authMode === 'login' ? 'Ro‘yxatdan o‘tish' : 'Kirish'}
                  </button>
                </div>

                {authError && (
                  <p className="text-xs text-rose-500 font-bold">{authError}</p>
                )}

                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Ism va familiya
                    </label>
                    <input
                      type="text"
                      name="tp_cust_fullname_manual"
                      autoComplete="off"
                      readOnly={!authInputsReady}
                      onFocus={() => setAuthInputsReady(true)}
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ismingizni kiriting"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Telefon raqam
                  </label>
                  <input
                    type="text"
                    name="tp_cust_phone_manual"
                    autoComplete="off"
                    readOnly={!authInputsReady}
                    onFocus={() => setAuthInputsReady(true)}
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Parol</label>
                  <input
                    type="password"
                    name="tp_cust_secret_manual"
                    autoComplete="new-password"
                    readOnly={!authInputsReady}
                    onFocus={() => setAuthInputsReady(true)}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Parolingizni kiriting"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-extrabold text-xs"
                >
                  {authMode === 'login' ? 'Kabinetga kirish' : 'Ro‘yxatdan o‘tish'}
                </button>
              </form>
            ) : (
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white flex items-center justify-center font-black text-lg">
                    {user.fullName[0]}
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      {user.fullName}
                    </h3>
                    <p className="text-xs text-cyan-500 font-bold">{user.phone}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setUserSession(null, null);
                    setProfileData(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-500/15 text-rose-500 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Hisobdan chiqish</span>
                </button>
              </div>
            )}
          </div>

          {/* Right: Orders or Addresses */}
          <div className="lg:col-span-8 space-y-5">
            {activeTab === 'orders' && (
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  📦 Buyurtmalarim tarixi ({profileData?.orders?.length || 0})
                </h2>

                {(!profileData?.orders || profileData.orders.length === 0) ? (
                  <p className="text-xs text-slate-500">
                    Buyurtmalar tarixini ko‘rish uchun chap tomondagi demo hisobga kiring yoki yangi buyurtma bering.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {profileData.orders.map((ord: any) => (
                      <div
                        key={ord.id}
                        className={`p-4 rounded-2xl border space-y-3 ${
                          ord.status === 'CANCELLED'
                            ? 'bg-rose-500/5 border-rose-500/40'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-black text-sm text-slate-900 dark:text-white">
                              #{ord.order_number}
                            </span>
                            <span
                              className={`ml-2 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                                ord.status === 'CANCELLED'
                                  ? 'bg-rose-500/20 text-rose-500'
                                  : ord.status === 'DELIVERED'
                                  ? 'bg-emerald-500/20 text-emerald-500'
                                  : 'bg-cyan-500/15 text-cyan-500'
                              }`}
                            >
                              {ord.status === 'CANCELLED' ? '❌ CANCELLED (BEKOR QILINDI)' : ord.status}
                            </span>
                            <span className="ml-2 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-[11px] font-extrabold">
                              {ord.payment_method} • {ord.payment_status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-cyan-600 dark:text-cyan-400">
                              {formatUzs(ord.total_uzs, lang)}
                            </span>
                            {ord.status !== 'DELIVERED' && ord.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleCancelOrder(ord.id)}
                                disabled={cancellingId === ord.id}
                                className="px-3 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-500 text-[11px] font-extrabold transition-all"
                              >
                                {cancellingId === ord.id ? 'Bekor qilinmoqda...' : '❌ Bekor qilish'}
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-500">
                          📍 {ord.region}, {ord.district}, {ord.address} (Kuzatuv: {ord.tracking_code})
                        </p>

                        <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                          {(ord.items || []).map((it: any) => (
                            <div key={it.id} className="flex justify-between">
                              <span>
                                {it.product_name} × {it.quantity}
                              </span>
                              <span className="font-bold">{formatUzs(it.total_uzs, lang)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  📍 Saqlangan yetkazib berish manzillarim
                </h2>

                <div className="space-y-3">
                  {(profileData?.addresses || []).map((a: any) => (
                    <div
                      key={a.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-extrabold text-cyan-500">{a.title}</p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                          {a.region}, {a.district}, {a.street}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {user && (
                  <form onSubmit={handleAddAddress} className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-extrabold uppercase text-slate-400">
                      Yangi manzil qo‘shish
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={addrTitle}
                        onChange={(e) => setAddrTitle(e.target.value)}
                        placeholder="Nomi (Uy / Ofis)"
                        className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                      />
                      <input
                        type="text"
                        value={addrRegion}
                        onChange={(e) => setAddrRegion(e.target.value)}
                        placeholder="Viloyat"
                        className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                      />
                      <input
                        type="text"
                        value={addrDistrict}
                        onChange={(e) => setAddrDistrict(e.target.value)}
                        placeholder="Tuman"
                        className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={addrStreet}
                        onChange={(e) => setAddrStreet(e.target.value)}
                        placeholder="Ko‘cha, uy va xonadon raqami..."
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                      />
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-extrabold text-xs"
                      >
                        Saqlash
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm">Yuklanmoqda...</div>}>
      <ProfileContent />
    </Suspense>
  );
}

