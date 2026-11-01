'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Cpu,
  Flame,
  Gamepad2,
  Laptop,
  Monitor,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Wrench,
  Zap,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { API_BASE, getLocalizedText } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';

export default function HomePage() {
  const { lang, t, openChatWithPrompt } = useStore();
  const [homeData, setHomeData] = useState<any>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/catalog/home`)
      .then((r) => r.json())
      .then((data) => {
        setHomeData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!homeData?.banners?.length) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % homeData.banners.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [homeData]);

  const banners = homeData?.banners || [];
  const currentBanner = banners[activeSlide] || {
    titleUz: 'AI GAMING PC BUILDER — ORZINGIZDAGI KOMPYUTERNI 10 SONIYADA YIG‘ING',
    subtitleUz:
      'Byudjetingiz va sevimli o‘yinlaringizni yozing — Sun’iy intellekt bazadagi haqiqiy qismlardan 100% mos konfiguratsiya va taxminiy FPS ni hisoblab beradi!',
    badgeText: 'YANGI AVLOD AI TEXNOLOGIYASI',
    ctaLink: '/pc-builder',
    imageUrl:
      'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-14">
      {/* 1. HERO BANNER & AI QUICK CARDS */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Main Hero Banner */}
        <div className="lg:col-span-8 relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border border-slate-800 min-h-[380px] flex items-center p-6 sm:p-10 shadow-2xl">
          <img
            src={currentBanner.imageUrl}
            alt="Hero Banner"
            className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent" />

          <div className="relative z-10 max-w-xl space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              {currentBanner.badgeText}
            </span>

            <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight">
              {getLocalizedText(currentBanner, 'title', lang)}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {getLocalizedText(currentBanner, 'subtitle', lang)}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href={currentBanner.ctaLink || '/pc-builder'}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all"
              >
                <Wrench className="w-4 h-4" />
                <span>AI PC Builder ni ochish</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/catalog"
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 text-white font-bold text-sm transition-all"
              >
                Katalogni ko‘rish
              </Link>
            </div>

            {banners.length > 1 && (
              <div className="flex items-center gap-2 pt-3">
                {banners.map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    className={`h-2 rounded-full transition-all ${
                      activeSlide === i ? 'w-8 bg-cyan-400' : 'w-2 bg-slate-600'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: AI Assistant & Express Promo */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          <div className="flex-1 rounded-3xl p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-cyan-950 border border-cyan-500/30 flex flex-col justify-between relative overflow-hidden shadow-xl">
            <div className="space-y-2 relative z-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                <Bot className="w-3.5 h-3.5" />
                24/7 AI TECH ASSISTANT
              </span>
              <h2 className="text-lg font-extrabold text-white">
                Noutbuk yoki Kompyuter tanlashda ikkilanyapsizmi?
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                AI maslahatchimiz PostgreSQL bazamizdagi haqiqiy mahsulotlarni solishtirib, FPS va byudjetingizga eng mosini topib beradi!
              </p>
            </div>
            <button
              onClick={() =>
                openChatWithPrompt(
                  'Assalomu alaykum! Menga 15 million so‘mgacha o‘yin va dasturlash uchun eng yaxshi variantni tavsiya qiling.',
                )
              }
              className="mt-4 w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Bot className="w-4 h-4" />
              <span>AI Maslahatchidan so‘rash</span>
            </button>
          </div>

          <div className="flex-1 rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-500/15 text-rose-500 text-[11px] font-extrabold">
                🔥 PROMO-KOD: TECHPULSE10
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Birinchi buyurtmangizga 1 000 000 so‘mgacha chegirma!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Savatda <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-cyan-500">TECHPULSE10</code> promo-kodini kiriting va 10% chegirmaga ega bo‘ling.
              </p>
            </div>
            <Link
              href="/catalog"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              <span>Xaridni boshlash</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. TRUST FEATURES STRIP */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Cpu,
            title: 'AI Gaming PC Builder',
            desc: 'Soket, DDR5, TDP va korpus mosligini 100% tekshiradi',
          },
          {
            icon: Truck,
            title: '14 Hududga Yetkazish',
            desc: 'Toshkentda 3 soatda, viloyatlarga 24–48 soatda',
          },
          {
            icon: ShieldCheck,
            title: '12–36 Oy Kafolat',
            desc: 'Barcha mahsulotlar 100% original va sertifikatlangan',
          },
          {
            icon: Zap,
            title: 'Click • Payme • Uzum',
            desc: 'Serverda kriptografik himoyalangan xavfsiz to‘lovlar',
          },
        ].map((f, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3.5"
          >
            <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-500 shrink-0">
              <f.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                {f.title}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* 3. ALL CATEGORIES GRID */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              📂 {t('allCategories')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kompyuter ehtiyot qismlari, noutbuklar, periferiya va elektronika
            </p>
          </div>
          <Link
            href="/catalog"
            className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
          >
            <span>{t('viewAll')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {(homeData?.categories || []).map((cat: any) => (
            <Link
              key={cat.id}
              href={`/catalog?category=${cat.slug}`}
              className="group p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 hover:border-cyan-500 transition-all flex flex-col justify-between gap-2 shadow-sm hover:shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/15 to-indigo-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                  {getLocalizedText(cat, 'name', lang)}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {cat.productCount || 1}+ mahsulot
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. PROMOTIONS / AKSIYALAR */}
      {!loading && homeData?.promotions?.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/15 text-rose-500">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Maxsus Aksiyalar va Chegirmalar
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cheklangan miqdordagi chegirmali elektronika va komponentlar
                </p>
              </div>
            </div>
            <Link
              href="/catalog"
              className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>{t('viewAll')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {homeData.promotions.slice(0, 4).map((p: any) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 5. BEST SELLERS (ENG KO'P SOTILADIGANLAR) */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              🏆 {t('bestSellers')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              O‘zbekiston geymerlari va dasturchilari eng ko‘p xarid qilayotgan modellar
            </p>
          </div>
          <Link
            href="/catalog?sort=best_selling"
            className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
          >
            <span>{t('viewAll')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {(homeData?.bestSellers || []).slice(0, 8).map((p: any) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* 6. AI GAMING PC BUILDER CALLOUT BANNER */}
      <section className="rounded-3xl p-6 sm:p-10 bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 border border-cyan-500/40 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="space-y-3 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-extrabold">
            <Gamepad2 className="w-4 h-4" />
            AI GAMING PC BUILDER ENGINE
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            CS2, PUBG, GTA V yoki Cyberpunk uchun kompyuter kerakmi?
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Byudjetingizni kiriting (masalan: <strong>15 000 000 so‘m</strong>) — AI barcha 8 ta komponentni (Protsessor, Videokarta, Motherboard, RAM, SSD, PSU, Kuler, Korpus) ombordagi haqiqiy mahsulotlardan tanlab, soket va quvvat mosligini tekshiradi hamda taxminiy FPS natijalarini ko‘rsatadi!
          </p>
        </div>
        <Link
          href="/pc-builder"
          className="px-7 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/25 shrink-0 flex items-center gap-2 transition-transform hover:scale-105"
        >
          <Wrench className="w-5 h-5" />
          <span>Kompyuter Yig‘ishni Boshlash</span>
        </Link>
      </section>

      {/* 7. NEW ARRIVALS & GAMING ZONE */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              🎮 {t('gamingZone')} & {t('newArrivals')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Yuqori FPS va kibersport turnirlari uchun maxsus tanlangan texnikalar
            </p>
          </div>
          <Link
            href="/catalog?sort=newest"
            className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
          >
            <span>{t('viewAll')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {(homeData?.newArrivals || []).slice(0, 4).map((p: any) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* 8. OFFICIAL BRANDS */}
      <section className="space-y-4">
        <h2 className="text-lg font-black text-slate-900 dark:text-white">
          🤝 {t('officialBrands')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {(homeData?.brands || []).map((b: any) => (
            <Link
              key={b.id}
              href={`/catalog?brand=${b.slug}`}
              className="px-4 py-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 text-center transition-all"
            >
              <p className="text-xs font-black text-slate-800 dark:text-white">{b.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{b.country}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 9. VERIFIED CUSTOMER REVIEWS */}
      <section className="space-y-5">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          ⭐ {t('customerReviews')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(homeData?.reviews || []).map((r: any) => (
            <div
              key={r.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {r.authorName}
                  </span>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: r.rating || 5 }).map((_, idx) => (
                      <Star key={idx} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  “{r.comment}”
                </p>
                {r.pros && (
                  <p className="text-[11px] text-emerald-500 font-medium">
                    + Afzalliklari: {r.pros}
                  </p>
                )}
              </div>
              <Link
                href={`/product/${r.productSlug}`}
                className="text-[11px] font-bold text-cyan-500 hover:underline pt-2 border-t border-slate-100 dark:border-slate-800 truncate"
              >
                📦 {r.productNameUz}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

