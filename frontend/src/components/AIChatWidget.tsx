'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  Headphones,
  MessageSquare,
  Send,
  ShoppingCart,
  Sparkles,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { API_BASE, formatUzs } from '@/lib/api';

interface ChatMessage {
  id: string;
  senderType: 'USER' | 'AI' | 'OPERATOR' | 'SYSTEM';
  senderName: string;
  content: string;
  recommendedProducts?: any[];
  createdAt?: string;
}

export function AIChatWidget() {
  const {
    lang,
    user,
    isChatOpen,
    setIsChatOpen,
    chatInitialPrompt,
    addToCart,
  } = useStore();

  const [sessionKey, setSessionKey] = useState<string>('');
  const [mode, setMode] = useState<'AI' | 'OPERATOR'>('AI');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      senderType: 'AI',
      senderName: 'TECHPULSE AI Maslahatchi',
      content:
        'Assalomu alaykum! 👋 Men **TECHPULSE.UZ** 24/7 AI texnik maslahatchisi va virtual menejeriman.\n\n• Haqiqiy PostgreSQL bazamizdan byudjetingizga mos **noutbuk, videokarta yoki tayyor kompyuter** topib beraman.\n• **CS2, PUBG, GTA V** uchun FPS va komponentlar mosligini tekshiraman.\n• Buyurtma holati (`TP-2026-1001`) yoki yetkazib berish bo‘yicha yordam beraman.\n• Istalgan vaqtda **jonli operatorga** ulay olaman!',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let key = localStorage.getItem('tp_chat_session');
    if (!key) {
      key = `sess-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('tp_chat_session', key);
    }
    setSessionKey(key);

    fetch(`${API_BASE}/ai/conversations/${key}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages);
          if (data.mode) setMode(data.mode);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (chatInitialPrompt && isChatOpen) {
      handleSendMessage(chatInitialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatInitialPrompt]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isChatOpen]);

  // Poll for operator replies when in OPERATOR mode
  useEffect(() => {
    if (!isChatOpen || !sessionKey) return;
    const timer = setInterval(() => {
      fetch(`${API_BASE}/ai/conversations/${sessionKey}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages(data.messages);
            if (data.mode) setMode(data.mode);
          }
        })
        .catch(() => {});
    }, 4500);
    return () => clearInterval(timer);
  }, [isChatOpen, sessionKey]);

  const handleSendMessage = async (textOverride?: string) => {
    const msgText = (textOverride ?? input).trim();
    if (!msgText || loading) return;
    if (!textOverride) setInput('');

    const tempUserMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      senderType: 'USER',
      senderName: user?.fullName || 'Mijoz',
      content: msgText,
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionKey,
          message: msgText,
          language: lang,
          customerName: user?.fullName || 'Sayt Mijozi',
          customerPhone: user?.phone || undefined,
          userId: user?.id || undefined,
        }),
      });
      const data = await res.json();
      if (data.mode) setMode(data.mode);

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          senderType: data.handoffToOperator ? 'SYSTEM' : 'AI',
          senderName: data.handoffToOperator ? 'Tizim Menejeri' : 'TECHPULSE AI Maslahatchi',
          content: data.reply || 'Javob olindi.',
          recommendedProducts: data.recommendedProducts || [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          senderType: 'SYSTEM',
          senderName: 'TECHPULSE Tizim',
          content:
            'Server bilan aloqa o‘rnatilmadi. Iltimos, birozdan so‘ng qayta urinib ko‘ring.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-emerald-500 text-white font-bold text-sm shadow-2xl shadow-cyan-500/40 hover:scale-105 transition-all"
        >
          <div className="relative">
            <Bot className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping" />
          </div>
          <div className="text-left">
            <p className="text-xs font-extrabold leading-none">24/7 AI Maslahatchi</p>
            <p className="text-[10px] text-cyan-100 leading-none mt-1">Bepul texnik yordam & Chat</p>
          </div>
        </button>
      )}

      {/* Chat Drawer */}
      {isChatOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[94vw] sm:w-[430px] h-[630px] max-h-[86vh] rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg">
                {mode === 'OPERATOR' ? (
                  <Headphones className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm">
                    {mode === 'OPERATOR' ? 'Jonli Operator Chat' : 'TECHPULSE AI Maslahatchi'}
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                    24/7 ONLINE
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  PostgreSQL bazasiga ulangan • UZ / RU / EN
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {mode === 'AI' && (
                <button
                  onClick={() => handleSendMessage('Meni jonli operatorga ulang')}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-semibold transition-colors"
                  title="Operatorga ulash"
                >
                  🎧 Operator
                </button>
              )}
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
            <button
              onClick={() =>
                handleSendMessage('Menga 16 mln so‘mgacha kuchli gaming noutbuk tavsiya qiling')
              }
              className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-cyan-500 shrink-0 font-medium"
            >
              💻 Gaming Noutbuk tanlash
            </button>
            <button
              onClick={() =>
                handleSendMessage('CS2 va PUBG uchun eng yaxshi RTX videokartani ko‘rsating')
              }
              className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-cyan-500 shrink-0 font-medium"
            >
              🎮 RTX Videokartalar
            </button>
            <button
              onClick={() => handleSendMessage('Buyurtma TP-2026-1001 holatini tekshiring')}
              className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-cyan-500 shrink-0 font-medium"
            >
              📦 Buyurtma holati
            </button>
            <Link
              href="/pc-builder"
              onClick={() => setIsChatOpen(false)}
              className="px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-600 dark:text-cyan-400 shrink-0 font-bold flex items-center gap-1"
            >
              <Wrench className="w-3 h-3" />
              AI PC Builder
            </Link>
          </div>

          {/* Messages List */}
          <div
            ref={scrollRef}
            className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-slate-950"
          >
            {messages.map((m) => {
              const isUser = m.senderType === 'USER';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    {isUser ? (
                      <User className="w-3 h-3 text-cyan-500" />
                    ) : m.senderType === 'OPERATOR' ? (
                      <Headphones className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                    )}
                    <span className="text-[10px] font-bold text-slate-400">{m.senderName}</span>
                  </div>

                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                      isUser
                        ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-br-none shadow-md'
                        : m.senderType === 'OPERATOR'
                        ? 'bg-emerald-950/90 border border-emerald-500/40 text-emerald-100 rounded-bl-none'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {m.content}
                  </div>

                  {/* Grounded DB Product Recommendations */}
                  {m.recommendedProducts && m.recommendedProducts.length > 0 && (
                    <div className="mt-2 w-[92%] space-y-2">
                      {m.recommendedProducts.map((prod: any) => (
                        <div
                          key={prod.id}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-cyan-500/30 flex items-center gap-2.5 shadow-sm"
                        >
                          <img
                            src={prod.imageUrl}
                            alt={prod.nameUz}
                            className="w-12 h-12 rounded-lg object-cover bg-slate-950 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/product/${prod.slug}`}
                              onClick={() => setIsChatOpen(false)}
                              className="text-xs font-bold text-slate-900 dark:text-white hover:text-cyan-400 line-clamp-1"
                            >
                              {prod.nameUz}
                            </Link>
                            <p className="text-xs font-extrabold text-cyan-600 dark:text-cyan-400">
                              {formatUzs(prod.priceUzs, lang)}
                            </p>
                            <p className="text-[10px] text-emerald-500 font-medium">
                              Omborda: {prod.stockQuantity} dona
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              addToCart({
                                id: prod.id,
                                slug: prod.slug,
                                nameUz: prod.nameUz,
                                priceUzs: Number(prod.priceUzs),
                                imageUrl: prod.imageUrl,
                                brandName: prod.brandName,
                                stockQuantity: Number(prod.stockQuantity || 10),
                              })
                            }
                            className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shrink-0"
                            title="Savatga qo‘shish"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-cyan-500 font-medium px-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                AI PostgreSQL omborini tekshirmoqda...
              </div>
            )}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Savolingizni yozing (O‘zbek, Rus yoki Ingliz tilida)..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white disabled:opacity-40 hover:opacity-95 transition-opacity"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

