import type { Metadata } from 'next';
import './globals.css';
import { StoreProvider } from '@/context/StoreContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { AIChatWidget } from '@/components/AIChatWidget';

export const metadata: Metadata = {
  title: 'TECHPULSE.UZ — O‘zbekistonning AI Asosidagi Professional Elektronika va Kompyuter Do‘koni',
  description:
    'Noutbuklar, Gaming Kompyuterlar, RTX Videokartalar, AMD Ryzen va Intel Protsessorlar, Monitorlar va Gaming Aksessuarlar. AI Gaming PC Builder bilan 10 soniyada kompyuter yig‘ing!',
  keywords: [
    'kompyuter do‘koni Toshkent',
    'gaming pc Uzbekistan',
    'noutbuklar narxi UZS',
    'RTX 4060 Toshkent',
    'AI PC Builder O‘zbekiston',
    'TECHPULSE.UZ',
  ],
  openGraph: {
    title: 'TECHPULSE.UZ — AI Electronics & Gaming PC Hypermarket',
    description:
      'Sun’iy intellekt yordamida kompyuter yig‘ish, 100% original elektronika va O‘zbekiston bo‘ylab tezkor yetkazib berish.',
    type: 'website',
    locale: 'uz_UZ',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" className="dark">
      <body className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 antialiased selection:bg-cyan-500 selection:text-slate-950 flex flex-col">
        <StoreProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <AIChatWidget />
        </StoreProvider>
      </body>
    </html>
  );
}

