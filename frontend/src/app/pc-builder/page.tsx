'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Gamepad2,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Zap,
} from 'lucide-react';
import { API_BASE, formatUzs } from '@/lib/api';
import { useStore } from '@/context/StoreContext';

export default function PcBuilderPage() {
  const { lang, addMultipleToCart } = useStore();
  const router = useRouter();

  const [prompt, setPrompt] = useState(
    'Menga PUBG, CS2 va GTA V o‘ynash uchun 200–300 FPS beradigan kompyuter kerak. Byudjetim 15 million so‘m.',
  );
  const [budgetUzs, setBudgetUzs] = useState(15_000_000);
  const [resolution, setResolution] = useState<'1080p' | '1440p' | '4K'>('1080p');
  const [graphicsPreset, setGraphicsPreset] = useState<'Competitive' | 'High' | 'Ultra'>('High');
  const [customSelection, setCustomSelection] = useState<Record<string, string>>({});
  const [buildResult, setBuildResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runAiBuild = async (overrideSelection?: Record<string, string>, overrideBudget?: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ai/pc-builder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          budgetUzs: overrideBudget ?? budgetUzs,
          resolution,
          graphicsPreset,
          language: lang,
          customSelection: overrideSelection ?? customSelection,
        }),
      });
      const data = await res.json();
      setBuildResult(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAiBuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwapPart = (slot: string, newProductId: string) => {
    const nextSel = { ...customSelection, [slot]: newProductId };
    setCustomSelection(nextSel);
    runAiBuild(nextSel);
  };

  const handleAddAllToCart = () => {
    if (!buildResult?.components?.length) return;
    const items = buildResult.components.map((c: any) => ({
      id: c.item.id,
      slug: c.item.slug,
      nameUz: c.item.nameUz,
      nameRu: c.item.nameRu,
      nameEn: c.item.nameEn,
      priceUzs: Number(c.item.priceUzs),
      imageUrl: c.item.imageUrl,
      brandName: c.item.brandName,
      stockQuantity: Number(c.item.stockQuantity || 10),
    }));
    addMultipleToCart(items);
    router.push('/cart');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* Header & AI Prompt Input */}
      <section className="rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border border-cyan-500/40 shadow-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-extrabold">
              <Sparkles className="w-3.5 h-3.5" />
              AI GAMING PC BUILDER ENGINE
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-white">
              Sun’iy Intellekt Kompyuter Konfiguratori
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Talabingiz va byudjetingizni yozing — AI PostgreSQL omboridagi haqiqiy komponentlardan 100% mos tizim yig‘ib beradi!
            </p>
          </div>
        </div>

        {/* AI Prompt Input & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 space-y-2">
            <label className="text-xs font-bold text-cyan-300 block">
              🤖 AI ga talabingizni yozing (O‘yinlar, FPS, vazifa va byudjet):
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Masalan: Menga PUBG, CS2 va GTA V o‘ynash uchun 200–300 FPS beradigan kompyuter kerak. Byudjetim 15 million so‘m."
              className="w-full p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                💰 Byudjet (UZS):
              </label>
              <input
                type="number"
                step={500000}
                value={budgetUzs}
                onChange={(e) => setBudgetUzs(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-extrabold text-sm"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  { label: '11 mln', val: 11_000_000 },
                  { label: '15 mln', val: 15_000_000 },
                  { label: '20 mln', val: 20_000_000 },
                  { label: '30 mln', val: 30_000_000 },
                ].map((b) => (
                  <button
                    key={b.val}
                    type="button"
                    onClick={() => {
                      setBudgetUzs(b.val);
                      setCustomSelection({});
                      runAiBuild({}, b.val);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                      budgetUzs === b.val
                        ? 'bg-cyan-500 text-slate-950 border-cyan-500'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-cyan-500'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  🖥️ Monitor Rezolyutsiyasi:
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold"
                >
                  <option value="1080p">FullHD (1920x1080)</option>
                  <option value="1440p">2K QHD (2560x1440)</option>
                  <option value="4K">4K UHD (3840x2160)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  🎨 Grafik Sozlamalar:
                </label>
                <select
                  value={graphicsPreset}
                  onChange={(e) => setGraphicsPreset(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold"
                >
                  <option value="Competitive">Kibersport (Competitive)</option>
                  <option value="High">Yuqori (High)</option>
                  <option value="Ultra">Maksimal (Ultra + RT)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>
              AI 8 ta komponent mosligini (Soket, DDR4/DDR5, TDP va Korpus) avtomatik tekshiradi
            </span>
          </div>

          <button
            onClick={() => {
              setCustomSelection({});
              runAiBuild({});
            }}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-cyan-500/25 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'AI Kompyuter Yig‘moqda...' : 'AI Yordamida Kompyuter Yig‘ish'}</span>
          </button>
        </div>
      </section>

      {buildResult && (
        <>
          {/* AI Summary, Compatibility Report & Estimated FPS */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: AI Explanation & Hardware Compatibility Checks */}
            <div className="lg:col-span-6 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  AI Xulosasi va Moslik Tekshiruvi
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                    buildResult.compatibility?.allCompatible
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                  }`}
                >
                  {buildResult.compatibility?.allCompatible
                    ? '✅ 100% MOS KOMPONENTLAR'
                    : '⚠️ MOSLIKNI TEKSHIRING'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                {buildResult.aiExplanation}
              </div>

              <div className="space-y-2">
                {(buildResult.compatibility?.checks || []).map((chk: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      {chk.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      {chk.check}
                    </span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-semibold text-right">
                      {chk.detail}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Estimated Game FPS Benchmarks */}
            <div className="lg:col-span-6 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-cyan-500" />
                    Taxminiy FPS Ko‘rsatkichlari ({buildResult.resolution} • {buildResult.graphicsPreset})
                  </h2>
                  <span className="text-xs font-bold text-slate-400">Benchmark Taxmini</span>
                </div>

                <div className="space-y-3">
                  {(buildResult.fpsEstimates || []).map((fps: any, idx: number) => {
                    const pct = Math.min(100, Math.round((fps.avg / 380) * 100));
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {fps.game}
                          </span>
                          <span className="font-black text-cyan-600 dark:text-cyan-400">
                            ~{fps.label}
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-600 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Muhim eslatma:</strong> Yuqoridagi FPS natijalari tanlangan {buildResult.resolution} rezolyutsiya, {buildResult.graphicsPreset} grafik sozlamalar va benchmark ma’lumotlariga asoslangan <strong>taxminiy</strong> ko‘rsatkichdir. Ular kafolatlangan FPS hisoblanmaydi.
                </span>
              </div>
            </div>
          </section>

          {/* 8 Selected Components Grid with Individual Swap Dropdown */}
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-cyan-500/40 text-white">
              <div>
                <p className="text-xs text-cyan-300 font-bold uppercase tracking-wider">
                  Yig‘ilgan Konfiguratsiya Umumiy Narxi (8 ta komponent)
                </p>
                <p className="text-2xl sm:text-4xl font-black text-white mt-0.5">
                  {formatUzs(buildResult.totalPriceUzs, lang)}
                </p>
              </div>

              <button
                onClick={handleAddAllToCart}
                className="px-7 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 flex items-center gap-2.5 transition-transform hover:scale-105"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Barcha 8 ta Komponentni Savatga Qo‘shish</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(buildResult.components || []).map((slotObj: any) => {
                const part = slotObj.item;
                const alternatives = buildResult.alternativesBySlot?.[slotObj.slot] || [];
                return (
                  <div
                    key={slotObj.slot}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4 shadow-sm hover:border-cyan-500/50 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={part.imageUrl}
                        alt={part.nameUz}
                        className="w-24 h-24 rounded-xl object-cover bg-slate-950 border border-slate-800 shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 text-[11px] font-extrabold uppercase">
                            {slotObj.titleUz}
                          </span>
                          <span className="text-[11px] text-emerald-500 font-bold">
                            Omborda: {part.stockQuantity} dona
                          </span>
                        </div>

                        <Link
                          href={part.productUrl}
                          className="text-sm font-extrabold text-slate-900 dark:text-white hover:text-cyan-400 flex items-center gap-1 line-clamp-2"
                        >
                          <span>{part.nameUz}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0 text-cyan-500" />
                        </Link>

                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {(part.specsList || []).map((s: any, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold"
                            >
                              {s.labelUz}: {s.value}
                            </span>
                          ))}
                        </div>

                        <p className="text-base font-black text-cyan-600 dark:text-cyan-400 pt-1">
                          {formatUzs(part.priceUzs, lang)}
                        </p>
                      </div>
                    </div>

                    {/* Swap Component Selector */}
                    {alternatives.length > 1 && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-500 shrink-0">
                          🔄 Almashtirish:
                        </span>
                        <select
                          value={part.id}
                          onChange={(e) => handleSwapPart(slotObj.slot, e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                        >
                          {alternatives.map((alt: any) => (
                            <option key={alt.id} value={alt.id}>
                              {alt.nameUz.slice(0, 48)} — {formatUzs(alt.priceUzs, lang)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

