'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Bot,
  CheckCircle2,
  Heart,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
} from 'lucide-react';
import { API_BASE, formatUzs, getLocalizedText } from '@/lib/api';
import { useStore } from '@/context/StoreContext';
import { ProductCard } from '@/components/ProductCard';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = String(params?.slug || '');
  const { lang, user, addToCart, toggleFavorite, isFavorite, openChatWithPrompt, showToast } =
    useStore();

  const [product, setProduct] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);

  // Review form state
  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`${API_BASE}/catalog/products/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setProduct(data);
          setSelectedImage(data.images?.[0] || '');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (user?.fullName) setAuthorName(user.fullName);
  }, [user]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !product) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`${API_BASE}/catalog/products/${product.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: authorName || 'Xaridor',
          rating,
          comment,
          pros,
          cons,
          userId: user?.id,
        }),
      });
      if (res.ok) {
        const refreshed = await fetch(`${API_BASE}/catalog/products/${slug}`).then((r) => r.json());
        setProduct(refreshed);
        setComment('');
        setPros('');
        setCons('');
        showToast('Sharhingiz muvaffaqiyatli qo‘shildi! ⭐');
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="h-96 rounded-3xl bg-slate-200 dark:bg-slate-900 animate-pulse" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-black">Mahsulot topilmadi</h1>
        <Link
          href="/catalog"
          className="inline-block px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
        >
          Katalogga qaytish
        </Link>
      </div>
    );
  }

  const title = getLocalizedText(product, 'name', lang);
  const desc = getLocalizedText(product, 'description', lang);
  const fav = isFavorite(product.id);

  const cartItem = {
    id: product.id,
    slug: product.slug,
    nameUz: product.nameUz,
    nameRu: product.nameRu,
    nameEn: product.nameEn,
    priceUzs: Number(product.priceUzs),
    imageUrl: selectedImage || product.images?.[0],
    brandName: product.brandName,
    stockQuantity: Number(product.stockQuantity ?? 10),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      {/* Breadcrumb */}
      <nav className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
        <Link href="/" className="hover:text-cyan-500">
          Bosh sahifa
        </Link>
        <span>/</span>
        <Link href="/catalog" className="hover:text-cyan-500">
          Katalog
        </Link>
        <span>/</span>
        <Link
          href={`/catalog?category=${product.categorySlug}`}
          className="hover:text-cyan-500 font-semibold text-cyan-600 dark:text-cyan-400"
        >
          {product.categoryNameUz}
        </Link>
        <span>/</span>
        <span className="text-slate-400 truncate max-w-xs">{title}</span>
      </nav>

      {/* Main Product Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Image Gallery */}
        <div className="lg:col-span-5 space-y-3">
          <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative">
            <img
              src={selectedImage || product.images?.[0]}
              alt={title}
              className="w-full h-full object-cover"
            />
            {product.discountPercent > 0 && (
              <span className="absolute top-4 left-4 px-3 py-1 rounded-xl bg-rose-500 text-white text-xs font-extrabold">
                -{product.discountPercent}% CHEGIRMA
              </span>
            )}
          </div>

          {product.images?.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto">
              {product.images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`w-20 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    selectedImage === img ? 'border-cyan-500' : 'border-transparent opacity-70'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info, Specs & Buy Box */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 text-xs font-extrabold uppercase">
              {product.brandName} • SKU: {product.sku}
            </span>
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>{Number(product.rating).toFixed(1)}</span>
              <span className="text-slate-400">
                ({product.reviews?.length || product.reviewsCount} ta sharh • {product.salesCount} marta xarid qilingan)
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-snug">
            {title}
          </h1>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{desc}</p>

          {/* Price & Stock Box */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                {product.oldPriceUzs && (
                  <p className="text-sm text-slate-400 line-through">
                    Eski narx: {formatUzs(product.oldPriceUzs, lang)}
                  </p>
                )}
                <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {formatUzs(product.priceUzs, lang)}
                </p>
              </div>

              <div className="text-right">
                {product.stockQuantity > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-extrabold">
                    <CheckCircle2 className="w-4 h-4" />
                    Omborda mavjud: {product.stockQuantity} dona
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 text-rose-500 text-xs font-extrabold">
                    Vaqtincha tugagan
                  </span>
                )}
              </div>
            </div>

            {/* Quantity + Add to Cart + Favorite + Ask AI */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-3.5 py-2.5 font-bold text-sm hover:text-cyan-500"
                >
                  -
                </button>
                <span className="px-4 py-2.5 text-sm font-extrabold">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(product.stockQuantity || 20, qty + 1))}
                  className="px-3.5 py-2.5 font-bold text-sm hover:text-cyan-500"
                >
                  +
                </button>
              </div>

              <button
                disabled={product.stockQuantity <= 0}
                onClick={() => addToCart(cartItem, qty)}
                className="flex-1 min-w-[180px] py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Savatga qo‘shish</span>
              </button>

              <button
                onClick={() => toggleFavorite(cartItem)}
                className={`p-3 rounded-xl border transition-all ${
                  fav
                    ? 'bg-rose-500 text-white border-rose-500'
                    : 'bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                <Heart className={`w-5 h-5 ${fav ? 'fill-white' : ''}`} />
              </button>

              <button
                onClick={() =>
                  openChatWithPrompt(
                    `"${product.nameUz}" (${formatUzs(product.priceUzs, 'uz')}) mahsulotining afzalliklari, kamchiliklari va o‘yinlardagi unumdorligi haqida batafsil ma’lumot bering.`,
                  )
                }
                className="py-3 px-4 rounded-xl bg-indigo-500/15 border border-indigo-500/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/25 font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <Bot className="w-4 h-4" />
                <span>AI dan so‘rash</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-cyan-500" />
                <span>Toshkentda 3 soatda, viloyatlarga 24–48 soatda yetkazish</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Rasmiy servis kafolati: {product.warrantyMonths} oy</span>
              </div>
            </div>
          </div>

          {/* Technical Specifications Table */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              ⚙️ Texnik xususiyatlari
            </h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {(product.specifications || []).map((sp: any, idx: number) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-4">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    {getLocalizedText(sp, 'label', lang)}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-right">
                    {sp.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews & Add Review Form */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            💬 Mijozlar sharhlari ({product.reviews?.length || 0})
          </h2>
          {(!product.reviews || product.reviews.length === 0) ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              Ushbu mahsulotga birinchi bo‘lib fikr qoldiring!
            </div>
          ) : (
            <div className="space-y-3">
              {product.reviews.map((rev: any) => (
                <div
                  key={rev.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      {rev.authorName}
                    </span>
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {rev.comment}
                  </p>
                  {rev.pros && (
                    <p className="text-[11px] text-emerald-500 font-semibold">
                      + Afzalliklari: {rev.pros}
                    </p>
                  )}
                  {rev.cons && (
                    <p className="text-[11px] text-rose-400 font-semibold">
                      - Kamchiliklari: {rev.cons}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Write Review Form */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleReviewSubmit}
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              ✍️ Sharh qoldirish
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Ismingiz</label>
              <input
                type="text"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Ismingizni kiriting"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Baholash</label>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-bold"
              >
                <option value={5}>⭐⭐⭐⭐⭐ (5 — A’lo)</option>
                <option value={4}>⭐⭐⭐⭐ (4 — Yaxshi)</option>
                <option value={3}>⭐⭐⭐ (3 — O‘rtacha)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Afzalliklari</label>
              <input
                type="text"
                value={pros}
                onChange={(e) => setPros(e.target.value)}
                placeholder="Yuqori FPS, jimjit kuler..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Sharhingiz</label>
              <textarea
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Mahsulot haqida taassurotingizni yozing..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submittingReview}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-extrabold text-xs hover:opacity-95"
            >
              {submittingReview ? 'Yuborilmoqda...' : 'Sharhni e’lon qilish'}
            </button>
          </form>
        </div>
      </section>

      {/* Similar Products */}
      {product.similarProducts?.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            🔄 O‘xshash mahsulotlar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {product.similarProducts.map((sim: any) => (
              <ProductCard key={sim.id} product={sim} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

