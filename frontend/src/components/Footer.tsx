'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Phone, ShieldCheck, Truck, Zap } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800/80 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Brand Info */}
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-emerald-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">
              TECHPULSE<span className="text-cyan-400">.UZ</span>
            </span>
          </Link>
          <p className="text-xs leading-relaxed text-slate-400">
            O‘zbekiston bozori uchun sun’iy intellektga asoslangan professional kompyuter texnikalari,
            gaming komponentlar va elektronika onlayn gipermarketi.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-bold text-cyan-400">
              CLICK
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-bold text-emerald-400">
              PAYME
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-bold text-indigo-400">
              UZUM BANK
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-bold text-amber-400">
              NAQD PUL
            </span>
          </div>
        </div>

        {/* Categories */}
        <div>
          <h4 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4">
            Asosiy Kategoriyalar
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/catalog?category=noutbuklar" className="hover:text-cyan-400 transition-colors">
                Noutbuklar va Ultrabuklar
              </Link>
            </li>
            <li>
              <Link href="/catalog?category=gaming-kompyuterlar" className="hover:text-cyan-400 transition-colors">
                Tayyor Gaming Kompyuterlar
              </Link>
            </li>
            <li>
              <Link href="/catalog?category=videokartalar" className="hover:text-cyan-400 transition-colors">
                Videokartalar (NVIDIA RTX 40)
              </Link>
            </li>
            <li>
              <Link href="/catalog?category=protsessorlar" className="hover:text-cyan-400 transition-colors">
                Protsessorlar (AMD Ryzen & Intel)
              </Link>
            </li>
            <li>
              <Link href="/catalog?category=monitorlar" className="hover:text-cyan-400 transition-colors">
                Kibersport Monitorlari (180Hz–360Hz)
              </Link>
            </li>
            <li>
              <Link href="/pc-builder" className="text-cyan-400 font-bold hover:underline">
                ⚡ AI Gaming PC Builder
              </Link>
            </li>
          </ul>
        </div>

        {/* Customer Service */}
        <div>
          <h4 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4">
            Mijozlar Uchun
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/profile?tab=tracking" className="hover:text-cyan-400 transition-colors">
                Buyurtma holatini kuzatish
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-cyan-400 transition-colors">
                Savat va To‘lov usullari
              </Link>
            </li>
            <li>
              <Link href="/profile" className="hover:text-cyan-400 transition-colors">
                Shaxsiy kabinet va Sevimlilar
              </Link>
            </li>
            <li>
              <Link href="/admin" className="hover:text-cyan-400 transition-colors">
                Admin Boshqaruv Paneli
              </Link>
            </li>
            <li className="flex items-center gap-1.5 text-emerald-400 pt-1">
              <ShieldCheck className="w-4 h-4" />
              Rasmiy servis kafolati: 12–36 oy
            </li>
          </ul>
        </div>

        {/* Contacts & Delivery */}
        <div className="space-y-3 text-xs">
          <h4 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4">
            Aloqa va Manzil
          </h4>
          <p className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>Toshkent sh., Yunusobod tumani, Amir Temur shoh ko‘chasi, 108-uy (TECHPULSE Showroom)</span>
          </p>
          <p className="flex items-center gap-2 text-white font-bold text-sm">
            <Phone className="w-4 h-4 text-emerald-400" />
            +998 (71) 200-88-99
          </p>
          <p className="flex items-center gap-2 text-slate-400">
            <Truck className="w-4 h-4 text-indigo-400 shrink-0" />
            Toshkentda 3 soatda, 12 viloyat va Qoraqalpog‘istonga 24–48 soatda yetkazib berish!
          </p>
        </div>
      </div>

      <div className="border-t border-slate-900 py-5 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} TECHPULSE.UZ — Barcha huquqlar himoyalangan. Barcha narxlar O‘zbekiston so‘mida (UZS) ko‘rsatilgan.
      </div>
    </footer>
  );
}

