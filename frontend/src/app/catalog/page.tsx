'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Filter, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { API_BASE, getLocalizedText } from '@/lib/api';
import { useStore } from '@/context/StoreContext';
import { ProductCard } from '@/components/ProductCard';

function CatalogContent() {
  const searchParams = useSearchParams();
  const { lang } = useStore();

  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [brand, setBrand] = useState(searchParams.get('brand') || 'all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [spec, setSpec] = useState('');
  const [minRating, setMinRating] = useState('');
  const [inStockOnly, setInStockOnly] = useState(true);
  const [sort, setSort] = useState(searchParams.get('sort') || 'best_selling');

  useEffect(() => {
    setQ(searchParams.get('q') || '');
    setCategory(searchParams.get('category') || 'all');
    setBrand(searchParams.get('brand') || 'all');
    if (searchParams.get('sort')) setSort(searchParams.get('sort')!);
  }, [searchParams]);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/catalog/categories`).then((r) => r.json()),
      fetch(`${API_BASE}/catalog/brands`).then((r) => r.json()),
    ])
      .then(([cats, brs]) => {
        setCategories(Array.isArray(cats) ? cats : []);
        setBrands(Array.isArray(brs) ? brs : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (category && category !== 'all') params.set('category', category);
    if (brand && brand !== 'all') params.set('brand', brand);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (spec) params.set('spec', spec);
    if (minRating) params.set('minRating', minRating);
    if (inStockOnly) params.set('inStock', 'true');
    if (sort) params.set('sort', sort);

    fetch(`${API_BASE}/catalog/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [q, category, brand, minPrice, maxPrice, spec, minRating, inStockOnly, sort]);

  const resetFilters = () => {
    setQ('');
    setCategory('all');
    setBrand('all');
    setMinPrice('');
    setMaxPrice('');
    setSpec('');
    setMinRating('');
    setInStockOnly(true);
    setSort('best_selling');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Elektronika va Kompyuter Texnikalari Katalogi
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            PostgreSQL omboridan topilgan mahsulotlar soni: <strong>{products.length} ta</strong>
          </p>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-cyan-500" />
          <span className="text-xs font-semibold text-slate-500">Saralash:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="best_selling">🔥 Eng ko‘p sotilganlar</option>
            <option value="price_asc">💰 Arzonrog‘idan boshlab (UZS)</option>
            <option value="price_desc">💎 Qimmatrog‘idan boshlab (UZS)</option>
            <option value="newest">✨ Yangi mahsulotlar</option>
            <option value="rating">⭐ Yuqori reytinglilar</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-3 space-y-5">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="font-extrabold text-sm flex items-center gap-2 text-slate-900 dark:text-white">
                <Filter className="w-4 h-4 text-cyan-500" />
                Filtrlar
              </span>
              <button
                onClick={resetFilters}
                className="text-xs text-cyan-500 hover:underline flex items-center gap-1 font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Tozalash
              </button>
            </div>

            {/* Keyword search */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                Nomi yoki modeli bo‘yicha
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="RTX 4060, Ryzen, ROG..."
                  className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>

            {/* Category filter */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                Kategoriya
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-medium"
              >
                <option value="all">Barcha kategoriyalar</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {getLocalizedText(c, 'name', lang)} ({c.productCount})
                  </option>
                ))}
              </select>
            </div>

            {/* Brand filter */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                Brend
              </label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-medium"
              >
                <option value="all">Barcha brendlar</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range in UZS */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                Narx oralig‘i (so‘m / UZS)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="Min (mas: 500000)"
                  className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                />
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Max (mas: 20000000)"
                  className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                />
              </div>
            </div>

            {/* Technical Specification Quick Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                Texnik xususiyatlar (Soket / Xotira)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['AM5', 'LGA1700', 'DDR5', 'DDR4', '8 GB', '16 GB', '32 GB', '1 TB', '180 Hz'].map(
                  (tag) => (
                    <button
                      key={tag}
                      onClick={() => setSpec(spec === tag ? '' : tag)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                        spec === tag
                          ? 'bg-cyan-500 text-slate-950 border-cyan-500'
                          : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Rating Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                Minimal reyting
              </label>
              <select
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-medium"
              >
                <option value="">Barchasi</option>
                <option value="4.9">⭐ 4.9 va undan yuqori</option>
                <option value="4.8">⭐ 4.8 va undan yuqori</option>
                <option value="4.5">⭐ 4.5 va undan yuqori</option>
              </select>
            </div>

            {/* Availability */}
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Faqat omborda mavjud mahsulotlar
              </span>
            </label>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="lg:col-span-9">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-900 animate-pulse"
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <p className="text-lg font-extrabold text-slate-900 dark:text-white">
                Tanlangan filtrlar bo‘yicha mahsulot topilmadi
              </p>
              <p className="text-xs text-slate-500">
                Qidiruv so‘zini o‘zgartiring yoki filtrlarni tozalab ko‘ring
              </p>
              <button
                onClick={resetFilters}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
              >
                Filtrlarni tiklash
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm">Yuklanmoqda...</div>}>
      <CatalogContent />
    </Suspense>
  );
}

