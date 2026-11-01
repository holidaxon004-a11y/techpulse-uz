export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export type Language = 'uz' | 'ru' | 'en';

export function formatUzs(amount: number | string | null | undefined, lang: Language = 'uz'): string {
  const num = Number(amount || 0);
  const formatted = num.toLocaleString('ru-RU');
  if (lang === 'ru') return `${formatted} сум`;
  if (lang === 'en') return `${formatted} UZS`;
  return `${formatted} so‘m`;
}

export function getLocalizedText(
  item: Record<string, any> | null | undefined,
  fieldPrefix: string,
  lang: Language,
): string {
  if (!item) return '';
  if (lang === 'ru' && item[`${fieldPrefix}Ru`]) return item[`${fieldPrefix}Ru`];
  if (lang === 'en' && item[`${fieldPrefix}En`]) return item[`${fieldPrefix}En`];
  return item[`${fieldPrefix}Uz`] || item[fieldPrefix] || '';
}

export const UI_TEXT: Record<Language, Record<string, string>> = {
  uz: {
    searchPlaceholder: 'Noutbuk, RTX 4060, Ryzen 7 7800X3D, monitor qidiring...',
    catalog: 'Katalog',
    pcBuilder: 'AI PC Builder',
    promotions: 'Aksiyalar',
    delivery: 'Yetkazib berish',
    cart: 'Savat',
    favorites: 'Sevimlilar',
    profile: 'Profil',
    adminPanel: 'Admin Panel',
    aiAssistant: 'AI Maslahatchi',
    addToCart: 'Savatga qo‘shish',
    addedToCart: 'Savatda',
    inStock: 'Omborda mavjud',
    outOfStock: 'Tugagan',
    bestSellers: 'Eng ko‘p sotiladigan mahsulotlar',
    newArrivals: 'Yangi kelgan mahsulotlar',
    featuredProducts: 'Tavsiya etilgan mahsulotlar',
    gamingZone: 'Pro Gaming & Kibersport mahsulotlari',
    officialBrands: 'Rasmiy hamkor brendlar',
    customerReviews: 'Xaridorlarimiz fikrlari',
    allCategories: 'Barcha kategoriyalar',
    viewAll: 'Barchasini ko‘rish',
    warranty: 'Rasmiy kafolat',
    months: 'oy',
  },
  ru: {
    searchPlaceholder: 'Поиск ноутбуков, RTX 4060, Ryzen 7 7800X3D, мониторов...',
    catalog: 'Каталог',
    pcBuilder: 'AI Сборка ПК',
    promotions: 'Акции',
    delivery: 'Доставка',
    cart: 'Корзина',
    favorites: 'Избранное',
    profile: 'Профиль',
    adminPanel: 'Админ панель',
    aiAssistant: 'ИИ Консультант',
    addToCart: 'В корзину',
    addedToCart: 'В корзине',
    inStock: 'В наличии',
    outOfStock: 'Нет в наличии',
    bestSellers: 'Хиты продаж',
    newArrivals: 'Новинки',
    featuredProducts: 'Рекомендуемые товары',
    gamingZone: 'Pro Gaming и Киберспорт',
    officialBrands: 'Официальные бренды',
    customerReviews: 'Отзывы покупателей',
    allCategories: 'Все категории',
    viewAll: 'Смотреть все',
    warranty: 'Официальная гарантия',
    months: 'мес.',
  },
  en: {
    searchPlaceholder: 'Search laptops, RTX 4060, Ryzen 7 7800X3D, monitors...',
    catalog: 'Catalog',
    pcBuilder: 'AI PC Builder',
    promotions: 'Deals',
    delivery: 'Delivery',
    cart: 'Cart',
    favorites: 'Wishlist',
    profile: 'Profile',
    adminPanel: 'Admin Panel',
    aiAssistant: 'AI Assistant',
    addToCart: 'Add to Cart',
    addedToCart: 'In Cart',
    inStock: 'In Stock',
    outOfStock: 'Out of Stock',
    bestSellers: 'Best Sellers',
    newArrivals: 'New Arrivals',
    featuredProducts: 'Recommended Gear',
    gamingZone: 'Pro Gaming & Esports Hardware',
    officialBrands: 'Official Partner Brands',
    customerReviews: 'Verified Customer Reviews',
    allCategories: 'All Categories',
    viewAll: 'View All',
    warranty: 'Official Warranty',
    months: 'mo.',
  },
};

