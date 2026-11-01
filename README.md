# ⚡ TECHPULSE.UZ — AI Asosidagi Professional Elektronika va Kompyuter Texnikalari Onlayn Do‘koni

O‘zbekiston bozori uchun maxsus ishlab chiqilgan, sun’iy intellekt bilan jihozlangan zamonaviy Full-Stack E-Commerce platforma.

---

## 🏗️ Arxitektura va Texnologiyalar Steki

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS (Dark & Light Mode), Lucide Icons, 3 til (`UZ`, `RU`, `EN`) va `UZS (so‘m)` valyutasi.
- **Backend:** NestJS, TypeScript, REST API, Socket.IO (Real-Time Chat Gateway), JWT + Refresh Token, Role-Based Access Control (`SUPER_ADMIN`, `MANAGER`, `SUPPORT`, `CUSTOMER`), API Rate Limiting, XSS va Input Sanitization.
- **Ma'lumotlar Bazasi:** PostgreSQL 16 (`pg` + `@electric-sql/pglite` o‘rnatilgan ACID PostgreSQL dvigateli) & Prisma ORM sxemasi (25 ta o‘zaro bog‘langan jadval).
- **AI Tizimi:**
  - **24/7 AI Tech Assistant & Virtual Manager:** Haqiqiy PostgreSQL bazasi bilan Tool Calling orqali ishlaydi (hech qachon yolg‘on narx yoki omborda yo‘q mahsulotni tavsiya qilmaydi).
  - **AI Gaming PC Builder:** O‘yinlar (`CS2`, `PUBG`, `GTA V`, `Dota 2`, `Cyberpunk 2077`), rezolyutsiya (`1080p`, `1440p`, `4K`) va byudjet asosida 8 ta komponentni tanlab, Soket (`AM5`/`LGA1700`), Xotira (`DDR5`/`DDR4`), Quvvat bloki (`PSU Wattage`) mosligini tekshiradi va taxminiy FPS hisoblaydi.
- **To‘lov Tizimlari:** `Click`, `Payme`, `Uzum Bank` (Serverda HMAC-SHA256 kriptografik imzo tekshiruvi bilan — soxta to‘lov tasdiqlari 403 xato bilan bloklanadi) hamda `Naqd pul`.
- **Avtomatlashtirish & Telegram Integratsiyasi:** Yangi buyurtma, buyurtma holati o‘zgarishi, omborda kam qolgan mahsulotlar va mijoz murojaatlari haqida avtomatik bildirishnomalar.

---

## 🚀 Ishga Tushirish Qo‘llanmasi

### 1. Backend serverni ishga tushirish (`http://localhost:4000/api`)
```bash
cd backend
npm install
npm run dev
```

### 2. Frontend ilovani ishga tushirish (`http://localhost:3000`)
```bash
cd frontend
npm install
npm run dev
```

### 3. Docker orqali to‘liq ishga tushirish
```bash
docker compose up --build -d
```

---

## 🔐 Demo Kirish Ma'lumotlari

### Admin Panel (`http://localhost:3000/admin`)
| Rol | Email | Parol | Ruxsatlar |
|---|---|---|---|
| **Super Admin** | `superadmin@techpulse.uz` | `Admin@2026!` | To‘liq tizim, mahsulotlar, buyurtmalar va AI boshqaruvi |
| **Manager** | `manager@techpulse.uz` | `Manager@2026!` | Mahsulotlar, ombor, buyurtmalar, marketing va analitika |
| **Support** | `support@techpulse.uz` | `Support@2026!` | Jonli operator chati, mijoz murojaatlari va buyurtmalar |

### Mijoz Profili (`http://localhost:3000/profile`)
- **Telefon:** `+998901234567`
- **Parol:** `User@2026!`
- **Demo Promo-Kodlar:** `TECHPULSE10` (10% chegirma), `GAMER5` (5% chegirma)
- **Demo Buyurtma Kuzatuv Raqami:** `TP-2026-1001`

