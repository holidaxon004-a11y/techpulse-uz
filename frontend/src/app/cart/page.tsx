'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  CreditCard,
  Lock,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
} from 'lucide-react';
import { API_BASE, formatUzs } from '@/lib/api';
import { useStore } from '@/context/StoreContext';

export default function CartPage() {
  const {
    lang,
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartTotalUzs,
    user,
    showToast,
  } = useStore();

  const [deliveryZones, setDeliveryZones] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('Toshkent shahri');
  const [selectedDistrict, setSelectedDistrict] = useState('Yunusobod');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+998');
  const [address, setAddress] = useState('');
  const [comment, setComment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CLICK' | 'PAYME' | 'UZUM'>('CLICK');

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountUzs: number;
    description: string;
  } | null>(null);
  const [couponError, setCouponError] = useState('');

  // Order & Server-Side Payment state
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [orderError, setOrderError] = useState('');

  useEffect(() => {
    if (user) {
      setCustomerName(user.fullName || '');
      setCustomerPhone(user.phone || '+998');
    }
  }, [user]);

  useEffect(() => {
    fetch(`${API_BASE}/catalog/delivery-zones`)
      .then((r) => r.json())
      .then((zones) => {
        if (Array.isArray(zones) && zones.length > 0) {
          setDeliveryZones(zones);
          setSelectedRegion(zones[0].regionNameUz);
          setSelectedDistrict(zones[0].districts?.[0] || '');
        }
      })
      .catch(() => {});
  }, []);

  const currentZone =
    deliveryZones.find((z) => z.regionNameUz === selectedRegion) || deliveryZones[0];
  const deliveryFeeUzs = currentZone
    ? cartTotalUzs >= currentZone.freeThresholdUzs
      ? 0
      : Number(currentZone.feeUzs)
    : 0;
  const discountUzs = appliedCoupon ? appliedCoupon.discountUzs : 0;
  const finalTotalUzs = Math.max(0, cartTotalUzs - discountUzs + deliveryFeeUzs);

  const handleRegionChange = (regionName: string) => {
    setSelectedRegion(regionName);
    const found = deliveryZones.find((z) => z.regionNameUz === regionName);
    if (found && found.districts?.length > 0) {
      setSelectedDistrict(found.districts[0]);
    }
  };

  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponInput.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/orders/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponInput.trim(),
          subtotalUzs: cartTotalUzs,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.message || 'Promo-kod yaroqsiz');
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon({
          code: data.code,
          discountUzs: Number(data.discountUzs),
          description: data.description,
        });
        showToast(`Promo-kod ${data.code} qo‘llanildi!`);
      }
    } catch {
      setCouponError('Promo-kodni tekshirishda xatolik');
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError('');
    if (cart.length === 0) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          customerName,
          customerPhone,
          region: selectedRegion,
          district: selectedDistrict,
          address,
          comment,
          couponCode: appliedCoupon?.code,
          paymentMethod,
          items: cart.map((i) => ({ productId: i.id, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOrderError(data.message || 'Buyurtma yaratishda xatolik yuz berdi');
      } else {
        setCreatedOrder(data);
        clearCart();
      }
    } catch {
      setOrderError('Server bilan bog‘lanishda xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyServerPayment = async () => {
    if (!createdOrder?.paymentSession) return;
    setVerifyingPayment(true);
    try {
      const res = await fetch(`${API_BASE}/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: createdOrder.orderId,
          provider: createdOrder.paymentSession.provider,
          amountUzs: createdOrder.paymentSession.amountUzs,
          signatureToken: createdOrder.paymentSession.signatureToken,
        }),
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        setCreatedOrder((prev: any) => ({
          ...prev,
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
          transactionId: data.transactionId,
        }));
        showToast(`${createdOrder.paymentMethod} to‘lovi serverda tasdiqlandi! ✅`);
      }
    } finally {
      setVerifyingPayment(false);
    }
  };

  // Order Confirmation & Server-Side Payment Screen
  if (createdOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-500/40 shadow-2xl space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-emerald-500 uppercase">
                BUYURTMA QABUL QILINDI
              </span>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                Buyurtma #{createdOrder.orderNumber}
              </h1>
              <p className="text-xs text-slate-500">
                Kuzatuv kodi: <code className="font-bold text-cyan-500">{createdOrder.trackingCode}</code>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <p className="text-slate-400">Buyurtma holati</p>
              <p className="font-extrabold text-cyan-500 mt-0.5">{createdOrder.status}</p>
            </div>
            <div>
              <p className="text-slate-400">To‘lov usuli</p>
              <p className="font-extrabold text-slate-900 dark:text-white mt-0.5">
                {createdOrder.paymentMethod}
              </p>
            </div>
            <div>
              <p className="text-slate-400">To‘lov holati</p>
              <p
                className={`font-extrabold mt-0.5 ${
                  createdOrder.paymentStatus === 'PAID' ? 'text-emerald-500' : 'text-amber-500'
                }`}
              >
                {createdOrder.paymentStatus}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Jami summa</p>
              <p className="font-extrabold text-slate-900 dark:text-white mt-0.5">
                {formatUzs(createdOrder.totalUzs, lang)}
              </p>
            </div>
          </div>

          {/* Official Server-Verified Payment Gateway Box for CLICK / PAYME / UZUM */}
          {createdOrder.paymentSession && createdOrder.paymentStatus !== 'PAID' && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border border-cyan-500/40 text-white space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-cyan-300">
                  <Lock className="w-4 h-4" />
                  RASMIY {createdOrder.paymentMethod} TO‘LOV SHLYUZI (HMAC SERVER VERIFIED)
                </span>
                <span className="text-xs text-slate-400">SSL 256-bit</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                To‘lov serverda maxfiy kriptografik imzo orqali tekshiriladi. Soxta to‘lov tasdiqlari avtomatik rad etiladi.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div>
                  <p className="text-xs text-slate-400">To‘lanadigan summa:</p>
                  <p className="text-2xl font-black text-emerald-400">
                    {formatUzs(createdOrder.totalUzs, lang)}
                  </p>
                </div>
                <button
                  onClick={handleVerifyServerPayment}
                  disabled={verifyingPayment}
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg hover:opacity-95"
                >
                  {verifyingPayment
                    ? 'Serverda tekshirilmoqda...'
                    : `${createdOrder.paymentMethod} orqali To‘lovni Tasdiqlash`}
                </button>
              </div>
            </div>
          )}

          {createdOrder.paymentStatus === 'PAID' && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-between">
              <span>
                ✅ To‘lov server tomonidan muvaffaqiyatli tasdiqlandi! Tranzaksiya ID:{' '}
                {createdOrder.transactionId}
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={`/profile?tab=tracking&order=${createdOrder.orderNumber}`}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-extrabold text-xs"
            >
              📦 Buyurtma holatini kuzatish
            </Link>
            <Link
              href="/catalog"
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs"
            >
              Xaridni davom ettirish
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-900 mx-auto flex items-center justify-center text-slate-400">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Savatingiz hozircha bo‘sh</h1>
        <p className="text-xs text-slate-500">
          Katalogdan mahsulot tanlang yoki AI Gaming PC Builder yordamida kompyuter yig‘ing!
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/catalog"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-extrabold text-xs"
          >
            Katalogga o‘tish
          </Link>
          <Link
            href="/pc-builder"
            className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white font-extrabold text-xs"
          >
            AI PC Builder
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-6">
        🛒 Savat va Buyurtmani Rasmiylashtirish
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Cart Items & Checkout Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* Cart Items */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="font-extrabold text-sm">
                Tanlangan mahsulotlar ({cart.reduce((s, i) => s + i.quantity, 0)} dona)
              </h2>
              <button
                onClick={clearCart}
                className="text-xs text-rose-500 hover:underline font-semibold"
              >
                Savatni tozalash
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {cart.map((item) => (
                <div key={item.id} className="py-4 flex items-center gap-4">
                  <img
                    src={item.imageUrl}
                    alt={item.nameUz}
                    className="w-20 h-20 rounded-xl object-cover bg-slate-950 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/product/${item.slug}`}
                      className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:text-cyan-400 line-clamp-2"
                    >
                      {item.nameUz}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Donasi: {formatUzs(item.priceUzs, lang)}
                    </p>
                    <p className="text-sm font-black text-cyan-600 dark:text-cyan-400 mt-1">
                      {formatUzs(item.priceUzs * item.quantity, lang)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2.5 py-1 font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="px-2.5 py-1 text-xs font-extrabold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2.5 py-1 font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Checkout Customer & Delivery Form */}
          <form
            id="checkout-form"
            onSubmit={handleCreateOrder}
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5"
          >
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-cyan-500" />
              Mijoz va Yetkazib berish ma’lumotlari (O‘zbekiston bo‘ylab)
            </h2>

            {orderError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-bold">
                {orderError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Ism va familiyangiz *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Masalan: Jasurbek Karimov"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Telefon raqamingiz *
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Viloyat / Hudud *
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-bold"
                >
                  {deliveryZones.map((z) => (
                    <option key={z.id} value={z.regionNameUz}>
                      {z.regionNameUz} ({z.estimatedHours})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Tuman yoki shahar *
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-bold"
                >
                  {(currentZone?.districts || ['Markaz']).map((d: string) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Aniq yetkazib berish manzili (Ko‘cha, uy, mo‘ljal) *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Amir Temur shoh ko‘chasi, 108-uy, 45-xonadon"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Buyurtmaga izoh (ixtiyoriy)
              </label>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Kuryer kelishidan 30 daqiqa oldin qo‘ng‘iroq qilsin..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
              />
            </div>

            {/* Payment Methods */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-500">
                <CreditCard className="w-4 h-4 inline mr-1 text-cyan-500" />
                To‘lov usulini tanlang:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'CLICK', title: 'CLICK Evolution', sub: 'Tezkor onlayn to‘lov' },
                  { id: 'PAYME', title: 'Payme', sub: 'UZCARD / HUMO' },
                  { id: 'UZUM', title: 'Uzum Bank', sub: 'Cashback & Nasiya' },
                  { id: 'CASH', title: 'Naqd pul', sub: 'Qabul qilganda' },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      paymentMethod === pm.id
                        ? 'bg-cyan-500/15 border-cyan-500 ring-2 ring-cyan-500/20'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <p className="text-xs font-black text-slate-900 dark:text-white">{pm.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{pm.sub}</p>
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* Right: Order Summary, Delivery Calculator & Promo Code */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 sticky top-24">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              📋 Buyurtma hisob-kitobi
            </h2>

            {/* Promo Code Box */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500">
                <Tag className="w-3.5 h-3.5 inline mr-1 text-cyan-500" />
                Promo-kod (masalan: <code className="text-cyan-500">TECHPULSE10</code>)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="TECHPULSE10"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-bold uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs hover:bg-cyan-600 transition-colors"
                >
                  Qo‘llash
                </button>
              </div>
              {couponError && <p className="text-[11px] text-rose-500 font-semibold">{couponError}</p>}
              {appliedCoupon && (
                <p className="text-[11px] text-emerald-500 font-bold">
                  ✅ {appliedCoupon.description} (-{formatUzs(appliedCoupon.discountUzs, lang)})
                </p>
              )}
            </div>

            <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Mahsulotlar qiymati:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatUzs(cartTotalUzs, lang)}
                </span>
              </div>

              {discountUzs > 0 && (
                <div className="flex justify-between text-emerald-500 font-bold">
                  <span>Promo-kod chegirmasi:</span>
                  <span>-{formatUzs(discountUzs, lang)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-slate-500">
                  Yetkazib berish ({selectedRegion}):
                </span>
                <span className="font-bold text-cyan-500">
                  {deliveryFeeUzs === 0 ? 'BEPUL (0 so‘m)' : formatUzs(deliveryFeeUzs, lang)}
                </span>
              </div>

              {currentZone && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-500">
                  <Truck className="w-4 h-4 text-cyan-500 shrink-0" />
                  <span>
                    Taxminiy yetkazish vaqti: <strong>{currentZone.estimatedHours}</strong>
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-end">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Jami to‘lov:
                </span>
                <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
                  {formatUzs(finalTotalUzs, lang)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-emerald-500 text-white font-black text-sm shadow-xl shadow-cyan-500/25 hover:opacity-95 transition-all"
            >
              {submitting ? 'Buyurtma rasmiylashtirilmoqda...' : 'Buyurtmani Tasdiqlash'}
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Tranzaksiyalar PostgreSQL ACID va Server-Side imzo bilan himoyalangan</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

