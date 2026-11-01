'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  CheckCircle2,
  Edit3,
  Headphones,
  Lock,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Send,
  Shield,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  Users,
} from 'lucide-react';
import { API_BASE, formatUzs } from '@/lib/api';
import { useStore } from '@/context/StoreContext';

export default function AdminDashboardPage() {
  const { lang, admin, adminToken, setAdminSession, showToast } = useStore();

  // Login state (qo'lda kiritiladi — brauzer autofill ham bloklanadi)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inputsReady, setInputsReady] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    setEmail('');
    setPassword('');
  }, []);

  // Active section
  const [activeTab, setActiveTab] = useState<
    'analytics' | 'products' | 'orders' | 'customers' | 'marketing' | 'ai'
  >('analytics');

  const [overview, setOverview] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [aiData, setAiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // New Product form
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState(3500000);
  const [newProdOldPrice, setNewProdOldPrice] = useState(3900000);
  const [newProdStock, setNewProdStock] = useState(15);
  const [newProdCategory, setNewProdCategory] = useState('cat-gpu');
  const [newProdBrand, setNewProdBrand] = useState('br-asus');
  const [newProdType, setNewProdType] = useState('GPU');
  const [newProdImage, setNewProdImage] = useState('');
  const [newProdSpecKey, setNewProdSpecKey] = useState('vram');
  const [newProdSpecVal, setNewProdSpecVal] = useState('8 GB GDDR6');

  // Inline product price/stock edit state
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);

  // Operator chat reply
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [operatorReplyText, setOperatorReplyText] = useState('');

  // New Coupon form
  const [cpnCode, setCpnCode] = useState('');
  const [cpnDesc, setCpnDesc] = useState('');
  const [cpnPercent, setCpnPercent] = useState(10);
  const [cpnMaxUzs, setCpnMaxUzs] = useState(500000);
  const [cpnMinUzs, setCpnMinUzs] = useState(1000000);

  // AI Settings edit state
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiProvider, setAiProvider] = useState('hybrid-db');
  const [aiModel, setAiModel] = useState('gemini-2.5-flash');
  const [aiLimit, setAiLimit] = useState(500);
  const [aiSystemPrompt, setAiSystemPrompt] = useState('');
  const [aiKnowledgeBase, setAiKnowledgeBase] = useState('');
  const [aiHandoffKeywords, setAiHandoffKeywords] = useState('');
  const [aiFallbackMsg, setAiFallbackMsg] = useState('');

  const loadAllAdminData = async (token: string) => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [ovRes, prodRes, catRes, brRes, aiRes] = await Promise.all([
        fetch(`${API_BASE}/admin/overview`, { headers }),
        fetch(`${API_BASE}/catalog/products`),
        fetch(`${API_BASE}/catalog/categories`),
        fetch(`${API_BASE}/catalog/brands`),
        fetch(`${API_BASE}/admin/ai`, { headers }),
      ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (prodRes.ok) {
        const pd = await prodRes.json();
        setProducts(pd.items || []);
      }
      if (catRes.ok) setCategories(await catRes.json());
      if (brRes.ok) setBrands(await brRes.json());
      if (aiRes.ok) {
        const ad = await aiRes.json();
        setAiData(ad);
        if (ad.settings) {
          setAiEnabled(Boolean(ad.settings.is_enabled));
          setAiProvider(ad.settings.provider || 'hybrid-db');
          setAiModel(ad.settings.model_name || 'gemini-2.5-flash');
          setAiLimit(Number(ad.settings.daily_free_limit || 500));
          setAiSystemPrompt(ad.settings.system_prompt || '');
          setAiKnowledgeBase(ad.settings.knowledge_base || '');
          setAiHandoffKeywords(ad.settings.handoff_keywords || '');
          setAiFallbackMsg(ad.settings.fallback_polite_msg_uz || '');
        }
      }

      // Role-specific endpoints
      const [ordRes, custRes, convRes, tktRes, cpnRes] = await Promise.all([
        fetch(`${API_BASE}/admin/orders`, { headers }),
        fetch(`${API_BASE}/admin/customers`, { headers }),
        fetch(`${API_BASE}/admin/conversations`, { headers }),
        fetch(`${API_BASE}/admin/tickets`, { headers }),
        fetch(`${API_BASE}/admin/coupons`, { headers }),
      ]);
      if (ordRes.ok) setOrders(await ordRes.json());
      if (custRes.ok) setCustomers(await custRes.json());
      if (convRes.ok) {
        const cv = await convRes.json();
        setConversations(cv);
        if (cv.length > 0 && !selectedConvId) setSelectedConvId(cv[0].id);
      }
      if (tktRes.ok) setTickets(await tktRes.json());
      if (cpnRes.ok) setCoupons(await cpnRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      loadAllAdminData(adminToken);
      if (admin?.role === 'SUPPORT' && activeTab === 'analytics') {
        setActiveTab('orders');
      }
      const timer = setInterval(() => {
        loadAllAdminData(adminToken);
      }, 4500);
      return () => clearInterval(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.message || 'Email/telefon yoki parol noto‘g‘ri');
      } else {
        setAdminSession(data.admin, data.accessToken);
        if (data.admin.role === 'SUPPORT') {
          setActiveTab('orders');
        } else {
          setActiveTab('analytics');
        }
        showToast(
          `Tizim rolingizni avtomatik aniqladi: ${data.admin.role} (${data.admin.fullName})`,
        );
      }
    } catch {
      setLoginError('Server bilan aloqa o‘rnatilmadi');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !newProdName.trim()) return;
    const res = await fetch(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        nameUz: newProdName,
        priceUzs: newProdPrice,
        oldPriceUzs: newProdOldPrice,
        stockQuantity: newProdStock,
        categoryId: newProdCategory,
        brandId: newProdBrand,
        componentType: newProdType,
        imageUrl: newProdImage,
        isFeatured: true,
        isGaming: true,
        specifications: [
          { key: newProdSpecKey, labelUz: newProdSpecKey.toUpperCase(), value: newProdSpecVal },
        ],
      }),
    });
    if (res.ok) {
      setNewProdName('');
      showToast('Yangi mahsulot PostgreSQL bazasiga va saytga qo‘shildi! ✅');
      loadAllAdminData(adminToken);
    } else {
      const err = await res.json();
      showToast(err.message || 'Ruxsat yo‘q');
    }
  };

  const handleSaveProductEdit = async (id: string) => {
    if (!adminToken) return;
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        priceUzs: editPrice,
        stockQuantity: editStock,
      }),
    });
    if (res.ok) {
      setEditingProdId(null);
      showToast('Mahsulot narxi va ombor qoldig‘i yangilandi! (AI va sayt bilan sinxronlandi)');
      loadAllAdminData(adminToken);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!adminToken) return;
    const res = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      showToast('Mahsulot saytdan olib tashlandi');
      loadAllAdminData(adminToken);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    if (!adminToken) return;
    const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      showToast(`Buyurtma holati "${status}" ga o‘zgartirildi va mijozga xabar yuborildi!`);
      loadAllAdminData(adminToken);
    }
  };

  const handleSendOperatorReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !selectedConvId || !operatorReplyText.trim()) return;
    const res = await fetch(`${API_BASE}/admin/conversations/${selectedConvId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        operatorName: admin?.fullName || 'TECHPULSE Operator',
        content: operatorReplyText,
      }),
    });
    if (res.ok) {
      setOperatorReplyText('');
      showToast('Javob mijoz chatiga yuborildi!');
      loadAllAdminData(adminToken);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !cpnCode.trim()) return;
    const res = await fetch(`${API_BASE}/admin/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        code: cpnCode,
        description: cpnDesc || `${cpnCode} maxsus chegirma kuponi`,
        discountPercent: cpnPercent,
        maxDiscountUzs: cpnMaxUzs,
        minOrderUzs: cpnMinUzs,
      }),
    });
    if (res.ok) {
      setCpnCode('');
      setCpnDesc('');
      showToast('Yangi promo-kod yaratildi!');
      loadAllAdminData(adminToken);
    }
  };

  const handleSaveAiSettings = async (resetCounter = false) => {
    if (!adminToken) return;
    const res = await fetch(`${API_BASE}/admin/ai/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        isEnabled: aiEnabled,
        provider: aiProvider,
        modelName: aiModel,
        dailyFreeLimit: aiLimit,
        systemPrompt: aiSystemPrompt,
        knowledgeBase: aiKnowledgeBase,
        handoffKeywords: aiHandoffKeywords,
        fallbackPoliteMsgUz: aiFallbackMsg,
        resetDailyCounter: resetCounter,
      }),
    });
    if (res.ok) {
      showToast('AI Maslahatchi sozlamalari saqlandi! 🤖');
      loadAllAdminData(adminToken);
    } else {
      const err = await res.json();
      showToast(err.message || 'Faqat SUPER_ADMIN AI sozlamalarini o‘zgartira oladi');
    }
  };

  // Protected Admin Login Screen
  if (!admin || !adminToken) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-lg">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold text-cyan-500 uppercase">
                RBAC PROTECTED AREA
              </span>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                TECHPULSE Admin Panel
              </h1>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Xodim email manzili (yoki telefon raqami) va maxfiy parolni kiriting. Tizim sizning rolingizni (<strong>Super Admin</strong>, <strong>Manager</strong> yoki <strong>Support Operator</strong>) avtomatik aniqlaydi.
          </p>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/15 text-rose-500 text-xs font-bold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4" autoComplete="off">
            {/* Brauzer avto-to'ldirishini (Chrome Autofill) bloklash uchun yashirin tuzoq */}
            <input type="text" name="fake_username_trap" className="hidden" tabIndex={-1} autoComplete="off" />
            <input type="password" name="fake_password_trap" className="hidden" tabIndex={-1} autoComplete="new-password" />

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Xodim Email yoki Telefon raqami
              </label>
              <input
                type="text"
                name="tp_staff_identifier_manual"
                autoComplete="off"
                readOnly={!inputsReady}
                onFocus={() => setInputsReady(true)}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email yoki telefon raqamingizni kiriting"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Maxfiy Parol</label>
              <input
                type="password"
                name="tp_staff_secret_manual"
                autoComplete="new-password"
                readOnly={!inputsReady}
                onFocus={() => setInputsReady(true)}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Parolingizni kiriting"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-bold"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-black text-xs shadow-lg"
            >
              Tizimga Kirish
            </button>
          </form>
        </div>
      </div>
    );
  }

  const selectedConversation = conversations.find((c) => c.id === selectedConvId);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top Admin Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border border-slate-800 text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black">{admin.fullName}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-extrabold">
                {admin.role}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ruxsatlar: {(admin.permissions || []).join(' • ')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadAllAdminData(adminToken)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Yangilash</span>
          </button>
          <button
            onClick={() => {
              setEmail('');
              setPassword('');
              setInputsReady(false);
              setAdminSession(null, null);
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Chiqish</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Rol va ruxsatlarga qarab avtomatik moslashadi) */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'analytics', label: '📊 Analitika & Ombor', icon: BarChart3, roles: ['SUPER_ADMIN', 'MANAGER', 'SUPPORT'] },
          { id: 'products', label: `💻 Mahsulotlar (${products.length})`, icon: Package, roles: ['SUPER_ADMIN', 'MANAGER'] },
          { id: 'orders', label: `🛒 Buyurtmalar (${orders.length})`, icon: ShoppingBag, roles: ['SUPER_ADMIN', 'MANAGER', 'SUPPORT'] },
          { id: 'customers', label: `🎧 Chat & Mijozlar (${conversations.length})`, icon: Headphones, roles: ['SUPER_ADMIN', 'MANAGER', 'SUPPORT'] },
          { id: 'marketing', label: `🎯 Marketing & Kuponlar`, icon: Tag, roles: ['SUPER_ADMIN', 'MANAGER'] },
          { id: 'ai', label: '🤖 AI Boshqaruv Paneli', icon: Bot, roles: ['SUPER_ADMIN'] },
        ]
          .filter((t) => t.roles.includes(admin.role))
          .map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                activeTab === t.id
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
              }`}
            >
              <t.icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          ))}
      </div>

      {/* ==================== TAB 1: ANALYTICS & NOTIFICATIONS ==================== */}
      {activeTab === 'analytics' && overview && (
        <div className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-400 font-semibold">Umumiy Savdo Tushumi</p>
              <p className="text-xl font-black text-emerald-500 mt-1">
                {formatUzs(overview.metrics.totalRevenueUzs, lang)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Bugungi: {formatUzs(overview.metrics.dailyRevenueUzs, lang)}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-400 font-semibold">Jami Buyurtmalar</p>
              <p className="text-2xl font-black text-cyan-500 mt-1">
                {overview.metrics.totalOrders} ta
              </p>
              <div className="flex items-center justify-between text-[11px] font-bold mt-1">
                <span className="text-amber-500">Yangi: {overview.metrics.newOrdersCount} ta</span>
                <span className="text-rose-500">
                  Bekor qilingan: {overview.metrics.cancelledOrdersCount || 0} ta
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-400 font-semibold">Ombor Statistikasi</p>
              <p className="text-2xl font-black text-indigo-500 mt-1">
                {overview.metrics.totalProducts} tur ({overview.metrics.totalStockUnits} dona)
              </p>
              <p className="text-[11px] text-rose-500 font-bold mt-1">
                Kam qolgan mahsulotlar: {overview.metrics.lowStockCount} ta
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-400 font-semibold">Ro‘yxatdan o‘tgan mijozlar</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {overview.metrics.totalCustomers} nafar
              </p>
              <p className="text-[11px] text-emerald-500 font-bold mt-1">
                AI 24/7 Faol maslahat bermoqda
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Top Selling Products */}
            <div className="lg:col-span-6 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                🏆 Eng ko‘p sotilgan mahsulotlar
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {(overview.topSellingProducts || []).map((p: any, idx: number) => (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {idx + 1}. {p.nameUz}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Narxi: {formatUzs(p.priceUzs, lang)} • Omborda: {p.stockQuantity} dona
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-500 font-extrabold shrink-0">
                      {p.salesCount} sotuv
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Telegram & Automated System Notification Log */}
            <div className="lg:col-span-6 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-500" />
                Avtomatlashtirish va Telegram Bot Bildirishnomalari
              </h2>
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {(overview.notifications || []).map((n: any) => (
                  <div
                    key={n.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-cyan-500">{n.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 font-bold">
                        {n.target} • {n.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-pre-line">
                      {n.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: PRODUCTS & INVENTORY MANAGEMENT ==================== */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Add New Product Form */}
          <div className="lg:col-span-4">
            <form
              onSubmit={handleCreateProduct}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5"
            >
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-500" />
                Yangi Mahsulot Qo‘shish
              </h2>
              <p className="text-[11px] text-slate-500">
                Qo‘shilgan mahsulot avtomatik ravishda sayt katalogiga va AI Maslahatchi bazasiga tushadi!
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Mahsulot nomi (UZ) *
                </label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="Masalan: Videokarta ASUS RTX 4070 Ti SUPER 16GB"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Narxi (UZS) *
                  </label>
                  <input
                    type="number"
                    required
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Eski narxi (UZS)
                  </label>
                  <input
                    type="number"
                    value={newProdOldPrice}
                    onChange={(e) => setNewProdOldPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Kategoriya</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameUz}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Brend</label>
                  <select
                    value={newProdBrand}
                    onChange={(e) => setNewProdBrand(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Ombordagi soni
                  </label>
                  <input
                    type="number"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Komponent turi
                  </label>
                  <select
                    value={newProdType}
                    onChange={(e) => setNewProdType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                  >
                    {['GPU', 'CPU', 'MOTHERBOARD', 'RAM', 'SSD', 'PSU', 'COOLER', 'CASE', 'LAPTOP', 'MONITOR', 'MOUSE', 'KEYBOARD'].map(
                      (t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newProdSpecKey}
                  onChange={(e) => setNewProdSpecKey(e.target.value)}
                  placeholder="Xususiyat (socket/vram)"
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                />
                <input
                  type="text"
                  value={newProdSpecVal}
                  onChange={(e) => setNewProdSpecVal(e.target.value)}
                  placeholder="Qiymati (16 GB / AM5)"
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-extrabold text-xs"
              >
                + Mahsulotni Bazaga va Saytga Qo‘shish
              </button>
            </form>
          </div>

          {/* Right: Live Product List with Price & Stock Sync */}
          <div className="lg:col-span-8 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              📦 Barcha Mahsulotlar — Narx va Ombor Boshqaruvi ({products.length})
            </h2>
            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {products.map((p) => {
                const isEditing = editingProdId === p.id;
                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={p.images?.[0]}
                        alt={p.nameUz}
                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate max-w-md">
                          {p.nameUz}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          SKU: {p.sku} • {p.brandName} • Sotuvlar: {p.salesCount}
                        </p>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(Number(e.target.value))}
                          className="w-28 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-cyan-500 font-bold"
                          placeholder="Narx UZS"
                        />
                        <input
                          type="number"
                          value={editStock}
                          onChange={(e) => setEditStock(Number(e.target.value))}
                          className="w-16 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-cyan-500 font-bold"
                          placeholder="Soni"
                        />
                        <button
                          onClick={() => handleSaveProductEdit(p.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-extrabold"
                        >
                          Saqlash
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-black text-cyan-600 dark:text-cyan-400">
                            {formatUzs(p.priceUzs, lang)}
                          </p>
                          <p className="text-[11px] text-emerald-500 font-bold">
                            Omborda: {p.stockQuantity} dona
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingProdId(p.id);
                            setEditPrice(p.priceUzs);
                            setEditStock(p.stockQuantity);
                          }}
                          className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 hover:text-cyan-400"
                          title="Narx va sonini tahrirlash"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-2 rounded-lg bg-rose-500/15 text-rose-500 hover:bg-rose-500/25"
                          title="O‘chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: ORDERS MANAGEMENT ==================== */}
      {activeTab === 'orders' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            🛒 Barcha Buyurtmalar Boshqaruvi ({orders.length})
          </h2>

          <div className="space-y-4">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className={`p-5 rounded-2xl border space-y-3 ${
                  ord.status === 'CANCELLED'
                    ? 'bg-rose-500/5 border-rose-500/40'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="font-black text-sm text-slate-900 dark:text-white">
                      #{ord.orderNumber}
                    </span>
                    <span
                      className={`ml-2 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                        ord.status === 'CANCELLED'
                          ? 'bg-rose-500/20 text-rose-500'
                          : ord.status === 'DELIVERED'
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : 'bg-cyan-500/20 text-cyan-500'
                      }`}
                    >
                      {ord.status === 'CANCELLED' ? '❌ CANCELLED (BEKOR QILINDI)' : ord.status}
                    </span>
                    <span className="ml-2 text-xs font-bold text-cyan-500">
                      👤 {ord.customerName} ({ord.customerPhone})
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      📍 {ord.region}, {ord.district}, {ord.address}
                      {ord.comment ? ` • 💬 ${ord.comment}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-400 text-xs font-bold">
                      {ord.paymentMethod} • {ord.paymentStatus}
                    </span>
                    <span className="text-base font-black text-emerald-500">
                      {formatUzs(ord.totalUzs, lang)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div className="text-slate-500">
                    Mahsulotlar:{' '}
                    {(ord.items || [])
                      .map((i: any) => `${i.productName.slice(0, 32)} (x${i.quantity})`)
                      .join(', ')}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-400">Holatni o‘zgartirish:</span>
                    {[
                      'NEW',
                      'CONFIRMED',
                      'PREPARING',
                      'SHIPPING',
                      'DELIVERED',
                      'CANCELLED',
                    ].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateOrderStatus(ord.id, st)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all ${
                          ord.status === st
                            ? 'bg-cyan-500 text-slate-950'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:border-cyan-500'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB 4: LIVE OPERATOR CHAT, TICKETS & CUSTOMERS ==================== */}
      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Conversations List */}
          <div className="lg:col-span-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              💬 AI va Operator Suhbatlari ({conversations.length})
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedConvId(c.id)}
                  className={`w-full p-3 rounded-2xl border text-left transition-all ${
                    selectedConvId === c.id
                      ? 'bg-cyan-500/15 border-cyan-500'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {c.customerName}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.mode === 'OPERATOR'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-cyan-500/20 text-cyan-400'
                      }`}
                    >
                      {c.mode}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-1">
                    {c.messages?.[c.messages.length - 1]?.content || 'Suhbat'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Active Conversation History & Operator Reply Box */}
          <div className="lg:col-span-8 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
            {selectedConversation ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">
                      Mijoz: {selectedConversation.customerName} (Sessiya:{' '}
                      {selectedConversation.sessionKey})
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Rejim: {selectedConversation.mode} • Holat: {selectedConversation.status}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-80 overflow-y-auto p-2">
                  {(selectedConversation.messages || []).map((m: any) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-2xl text-xs ${
                        m.senderType === 'USER'
                          ? 'bg-cyan-500/15 border border-cyan-500/30 ml-8'
                          : m.senderType === 'OPERATOR'
                          ? 'bg-emerald-500/15 border border-emerald-500/30 mr-8'
                          : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 mr-8'
                      }`}
                    >
                      <p className="text-[10px] font-extrabold text-cyan-500 mb-1">
                        {m.senderName} ({m.senderType})
                      </p>
                      <p className="whitespace-pre-line">{m.content}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendOperatorReply} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={operatorReplyText}
                    onChange={(e) => setOperatorReplyText(e.target.value)}
                    placeholder="Jonli operator sifatida mijozga javob yozing (AI rejimidan Operator rejimiga o‘tadi)..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Yuborish</span>
                  </button>
                </form>
              </>
            ) : (
              <p className="text-xs text-slate-500">Suhbatni tanlang</p>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 5: MARKETING & COUPONS ==================== */}
      {activeTab === 'marketing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5">
            <form
              onSubmit={handleCreateCoupon}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                🎟️ Yangi Promo-Kod Yaratish
              </h2>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Promo-kod (masalan: SUMMER20)
                </label>
                <input
                  type="text"
                  required
                  value={cpnCode}
                  onChange={(e) => setCpnCode(e.target.value.toUpperCase())}
                  placeholder="CYBER15"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-bold uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tavsifi</label>
                <input
                  type="text"
                  value={cpnDesc}
                  onChange={(e) => setCpnDesc(e.target.value)}
                  placeholder="Barcha mahsulotlarga 15% chegirma"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Foiz (%)
                  </label>
                  <input
                    type="number"
                    value={cpnPercent}
                    onChange={(e) => setCpnPercent(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Maks chegirma
                  </label>
                  <input
                    type="number"
                    value={cpnMaxUzs}
                    onChange={(e) => setCpnMaxUzs(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Min buyurtma
                  </label>
                  <input
                    type="number"
                    value={cpnMinUzs}
                    onChange={(e) => setCpnMinUzs(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-extrabold text-xs"
              >
                Promo-Kodni Saqlash
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Faol Promo-Kodlar ({coupons.length})
            </h2>
            <div className="space-y-3">
              {coupons.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-500 font-black">
                      {c.code} (-{c.discount_percent}%)
                    </span>
                    <p className="text-slate-500 mt-1">{c.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      Maks: {formatUzs(c.max_discount_uzs, lang)}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Ishlatildi: {c.used_count} / {c.usage_limit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 6: AI MANAGEMENT PANEL (SECTION 15) ==================== */}
      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: AI Controls, Provider, Limits, Knowledge Base */}
          <div className="lg:col-span-6 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-cyan-500" />
                AI Management & Boshqaruv Paneli
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span className="text-xs font-extrabold text-emerald-500">
                  {aiEnabled ? 'AI YOQILGAN' : 'AI O‘CHIRILGAN'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Modulli AI Provayder
                </label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-bold"
                >
                  <option value="hybrid-db">Hybrid DB Engine (Bepul 24/7)</option>
                  <option value="gemini">Google Gemini API</option>
                  <option value="openai">OpenAI GPT API</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">AI Modeli</label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-bold"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Kunlik Bepul Limit
                </label>
                <input
                  type="number"
                  value={aiLimit}
                  onChange={(e) => setAiLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                AI Tizim Ko‘rsatmalari (System Prompt)
              </label>
              <textarea
                rows={2}
                value={aiSystemPrompt}
                onChange={(e) => setAiSystemPrompt(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                AI Bilim Bazasi (Yetkazib berish, Kafolat, Do‘kon qoidalari)
              </label>
              <textarea
                rows={3}
                value={aiKnowledgeBase}
                onChange={(e) => setAiKnowledgeBase(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Operatorga Yo‘naltirish Kalit So‘zlari (vergul bilan)
              </label>
              <input
                type="text"
                value={aiHandoffKeywords}
                onChange={(e) => setAiHandoffKeywords(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Bepul Limit Tugaganda Muloyim Xabar (Yashirin pullik xarajatlarsiz)
              </label>
              <textarea
                rows={2}
                value={aiFallbackMsg}
                onChange={(e) => setAiFallbackMsg(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => handleSaveAiSettings(false)}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-extrabold text-xs"
              >
                Sozlamalarni Saqlash
              </button>
              <button
                onClick={() => handleSaveAiSettings(true)}
                className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
              >
                Kunlik Hisoblagichni 0 qilish
              </button>
            </div>
          </div>

          {/* Right: AI Stats & Usage Logs */}
          <div className="lg:col-span-6 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              AI Statistikasi va Tool Calling Loglari
            </h2>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <p className="text-[11px] text-slate-400">Bugungi so‘rovlar</p>
                <p className="text-lg font-black text-cyan-500">
                  {aiData?.settings?.daily_used_count || 0} / {aiLimit}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <p className="text-[11px] text-slate-400">Jami Tokenlar</p>
                <p className="text-lg font-black text-indigo-500">
                  {aiData?.stats?.total_tokens || 0}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <p className="text-[11px] text-slate-400">Xarajat (Bepul rejim)</p>
                <p className="text-lg font-black text-emerald-500">0 so‘m</p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {(aiData?.recentLogs || []).map((log: any) => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-cyan-500">
                      {log.feature} ({log.model})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {log.latency_ms} ms • Tools: {log.tools_called}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    So‘rov: “{log.prompt}”
                  </p>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{log.response}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

