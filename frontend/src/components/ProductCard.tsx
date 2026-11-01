'use client';

import React from 'react';
import Link from 'next/link';
import { Check, Heart, ShoppingCart, Star } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { formatUzs, getLocalizedText } from '@/lib/api';

export function ProductCard({ product }: { product: any }) {
  const { lang, t, addToCart, toggleFavorite, isFavorite, cart } = useStore();
  const fav = isFavorite(product.id);
  const inCart = cart.some((c) => c.id === product.id);
  const title = getLocalizedText(product, 'name', lang);
  const imageUrl =
    product.images?.[0] ||
    product.imageUrl ||
    'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=80';

  const cartPayload = {
    id: product.id,
    slug: product.slug,
    nameUz: product.nameUz,
    nameRu: product.nameRu,
    nameEn: product.nameEn,
    priceUzs: Number(product.priceUzs),
    imageUrl,
    brandName: product.brandName,
    stockQuantity: Number(product.stockQuantity ?? 10),
  };

  return (
    <div className="group relative rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/90 hover:border-cyan-500/60 dark:hover:border-cyan-500/60 transition-all duration-300 flex flex-col overflow-hidden shadow-sm hover:shadow-xl hover:shadow-cyan-500/10">
      {/* Badges & Favorite Button */}
      <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-950 overflow-hidden">
        <Link href={`/product/${product.slug}`} className="block w-full h-full">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </Link>

        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          {product.discountPercent > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white text-[11px] font-extrabold shadow">
              -{product.discountPercent}%
            </span>
          )}
          {product.isNew && (
            <span className="px-2 py-0.5 rounded-md bg-cyan-500 text-slate-950 text-[11px] font-extrabold shadow">
              NEW
            </span>
          )}
          {product.isGaming && (
            <span className="px-2 py-0.5 rounded-md bg-indigo-600/90 text-white text-[10px] font-bold">
              GAMING
            </span>
          )}
        </div>

        <button
          onClick={() => toggleFavorite(cartPayload)}
          aria-label="Toggle Favorite"
          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all ${
            fav
              ? 'bg-rose-500 text-white shadow-lg'
              : 'bg-slate-900/60 text-white hover:bg-rose-500'
          }`}
        >
          <Heart className={`w-4 h-4 ${fav ? 'fill-white' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
              {product.brandName || 'TECHPULSE'}
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              {Number(product.rating || 4.9).toFixed(1)}
              <span className="text-slate-400 text-[11px]">({product.reviewsCount || 12})</span>
            </span>
          </div>

          <Link
            href={`/product/${product.slug}`}
            className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-500 transition-colors line-clamp-2 min-h-[2.5rem]"
          >
            {title}
          </Link>

          {/* Key Specs Pills */}
          {product.specifications && product.specifications.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {product.specifications.slice(0, 3).map((sp: any, i: number) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 text-[10px] font-medium truncate max-w-[140px]"
                >
                  {sp.value}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Stock & Price + Add to Cart */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            {product.stockQuantity > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t('inStock')}: {product.stockQuantity} dona
              </span>
            ) : (
              <span className="text-rose-500 font-semibold">{t('outOfStock')}</span>
            )}
            <span className="text-slate-400">
              {product.warrantyMonths || 12} {t('months')}
            </span>
          </div>

          <div className="flex items-end justify-between gap-2">
            <div>
              {product.oldPriceUzs && Number(product.oldPriceUzs) > Number(product.priceUzs) && (
                <p className="text-[11px] text-slate-400 line-through leading-none">
                  {formatUzs(product.oldPriceUzs, lang)}
                </p>
              )}
              <p className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
                {formatUzs(product.priceUzs, lang)}
              </p>
            </div>

            <button
              disabled={product.stockQuantity <= 0}
              onClick={() => addToCart(cartPayload, 1)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 ${
                product.stockQuantity <= 0
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                  : inCart
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-md shadow-cyan-500/20'
              }`}
            >
              {inCart ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{t('addedToCart')}</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>{t('addToCart')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

