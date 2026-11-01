import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import * as path from 'path';
import * as fs from 'fs';
import { hashPassword } from '../common/security.util';
import {
  SEED_BANNERS,
  SEED_BRANDS,
  SEED_CATEGORIES,
  SEED_DELIVERY_ZONES,
  SEED_PRODUCTS,
} from '../../prisma/seed-data';

export interface QueryExecutor {
  query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }>;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy, QueryExecutor {
  private pglite: PGlite | null = null;
  private pgPool: Pool | null = null;
  private isInitialized = false;

  async onModuleInit() {
    await this.init();
  }

  async onModuleDestroy() {
    if (this.pgPool) {
      await this.pgPool.end();
    }
    if (this.pglite) {
      await this.pglite.close();
    }
  }

  async init() {
    if (this.isInitialized) return;

    const useExternal =
      process.env.USE_EMBEDDED_POSTGRES === 'false' && Boolean(process.env.DATABASE_URL);

    if (useExternal) {
      try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        await pool.query('SELECT 1');
        this.pgPool = pool;
        console.log('[DatabaseService] Connected to external PostgreSQL database');
      } catch (err) {
        console.warn(
          '[DatabaseService] External PostgreSQL unreachable, activating Embedded PostgreSQL 16 (PGlite ACID engine)...',
        );
      }
    }

    if (!this.pgPool) {
      const dataDir = path.join(process.cwd(), 'data', 'pgdata');
      fs.mkdirSync(dataDir, { recursive: true });
      this.pglite = new PGlite(dataDir);
      await this.pglite.waitReady;
      console.log(`[DatabaseService] PostgreSQL 16 Engine ready at ${dataDir}`);
    }

    await this.createSchema();
    await this.seedIfEmpty();
    this.isInitialized = true;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[] }> {
    if (this.pgPool) {
      const res = await this.pgPool.query(sql, params);
      return { rows: res.rows as T[] };
    }
    if (!this.pglite) {
      await this.init();
    }
    const res = await this.pglite!.query<T>(sql, params);
    return { rows: res.rows };
  }

  async exec(sql: string): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.query(sql);
      return;
    }
    if (!this.pglite) {
      await this.init();
    }
    await this.pglite!.exec(sql);
  }

  /**
   * Tranzaksiyaviy bajarish (Buyurtma va Ombor o'zgarishlari uchun ACID tranzaksiya)
   */
  async withTransaction<T>(fn: (tx: QueryExecutor) => Promise<T>): Promise<T> {
    if (this.pgPool) {
      const client = await this.pgPool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn({
          query: async <R = any>(sql: string, params: any[] = []) => {
            const r = await client.query(sql, params);
            return { rows: r.rows as R[] };
          },
        });
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    if (!this.pglite) {
      await this.init();
    }
    return this.pglite!.transaction(async (tx) => {
      return fn({
        query: async <R = any>(sql: string, params: any[] = []) => {
          const r = await tx.query<R>(sql, params);
          return { rows: r.rows };
        },
      });
    });
  }

  private async createSchema() {
    const ddl = `
      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        language TEXT DEFAULT 'uz',
        avatar_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        role_id TEXT REFERENCES roles(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role_id TEXT NOT NULL REFERENCES roles(id),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name_uz TEXT NOT NULL,
        name_ru TEXT NOT NULL,
        name_en TEXT NOT NULL,
        icon TEXT NOT NULL,
        description TEXT,
        parent_id TEXT REFERENCES categories(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS brands (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT UNIQUE NOT NULL,
        logo_url TEXT,
        country TEXT,
        is_featured BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        sku TEXT UNIQUE NOT NULL,
        name_uz TEXT NOT NULL,
        name_ru TEXT NOT NULL,
        name_en TEXT NOT NULL,
        short_desc_uz TEXT NOT NULL,
        short_desc_ru TEXT NOT NULL,
        short_desc_en TEXT NOT NULL,
        description_uz TEXT NOT NULL,
        description_ru TEXT NOT NULL,
        description_en TEXT NOT NULL,
        price_uzs BIGINT NOT NULL,
        old_price_uzs BIGINT,
        discount_percent INTEGER DEFAULT 0,
        category_id TEXT NOT NULL REFERENCES categories(id),
        brand_id TEXT NOT NULL REFERENCES brands(id),
        component_type TEXT,
        rating DOUBLE PRECISION DEFAULT 4.8,
        reviews_count INTEGER DEFAULT 0,
        sales_count INTEGER DEFAULT 0,
        is_featured BOOLEAN DEFAULT FALSE,
        is_new BOOLEAN DEFAULT FALSE,
        is_best_seller BOOLEAN DEFAULT FALSE,
        is_gaming BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        warranty_months INTEGER DEFAULT 12,
        seo_title TEXT,
        seo_description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS product_images (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        alt_text TEXT,
        is_primary BOOLEAN DEFAULT FALSE,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS product_specifications (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        label_uz TEXT NOT NULL,
        label_ru TEXT NOT NULL,
        label_en TEXT NOT NULL,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        product_id TEXT UNIQUE NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        reserved_quantity INTEGER NOT NULL DEFAULT 0,
        low_stock_threshold INTEGER NOT NULL DEFAULT 5,
        warehouse_location TEXT DEFAULT 'Toshkent Bosh Ombori A-1',
        in_stock BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        user_id TEXT REFERENCES users(id),
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        region TEXT NOT NULL,
        district TEXT NOT NULL,
        address TEXT NOT NULL,
        comment TEXT,
        status TEXT NOT NULL DEFAULT 'NEW',
        subtotal_uzs BIGINT NOT NULL,
        delivery_fee_uzs BIGINT NOT NULL DEFAULT 0,
        discount_uzs BIGINT NOT NULL DEFAULT 0,
        total_uzs BIGINT NOT NULL,
        coupon_code TEXT,
        payment_method TEXT NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'PENDING',
        tracking_code TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id),
        product_name TEXT NOT NULL,
        price_uzs BIGINT NOT NULL,
        quantity INTEGER NOT NULL,
        total_uzs BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        amount_uzs BIGINT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        external_tx_id TEXT UNIQUE,
        signature_verified BOOLEAN DEFAULT FALSE,
        raw_payload TEXT,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id),
        author_name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT NOT NULL,
        pros TEXT,
        cons TEXT,
        is_verified BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS favorites (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, product_id)
      );

      CREATE TABLE IF NOT EXISTS addresses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        region TEXT NOT NULL,
        district TEXT NOT NULL,
        street TEXT NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS coupons (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL,
        discount_percent INTEGER NOT NULL,
        max_discount_uzs BIGINT NOT NULL,
        min_order_uzs BIGINT NOT NULL,
        usage_limit INTEGER DEFAULT 100,
        used_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        session_key TEXT UNIQUE NOT NULL,
        user_id TEXT REFERENCES users(id),
        customer_name TEXT DEFAULT 'Mehmon Mijoz',
        customer_phone TEXT,
        language TEXT DEFAULT 'uz',
        mode TEXT DEFAULT 'AI',
        status TEXT DEFAULT 'ACTIVE',
        assigned_admin_id TEXT REFERENCES admins(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_type TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        content TEXT NOT NULL,
        recommended_products TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS support_tickets (
        id TEXT PRIMARY KEY,
        ticket_number TEXT UNIQUE NOT NULL,
        user_id TEXT REFERENCES users(id),
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        subject TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT DEFAULT 'MEDIUM',
        status TEXT DEFAULT 'OPEN',
        message TEXT NOT NULL,
        admin_reply TEXT,
        assigned_admin_id TEXT REFERENCES admins(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ai_usage_logs (
        id TEXT PRIMARY KEY,
        session_key TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        feature TEXT NOT NULL,
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        tools_called TEXT,
        tokens_used INTEGER DEFAULT 0,
        estimated_cost DOUBLE PRECISION DEFAULT 0,
        latency_ms INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        target TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ai_settings (
        id TEXT PRIMARY KEY,
        is_enabled BOOLEAN DEFAULT TRUE,
        provider TEXT DEFAULT 'hybrid-db',
        model_name TEXT DEFAULT 'gemini-2.5-flash',
        daily_free_limit INTEGER DEFAULT 500,
        daily_used_count INTEGER DEFAULT 0,
        system_prompt TEXT NOT NULL,
        knowledge_base TEXT NOT NULL,
        handoff_keywords TEXT NOT NULL,
        fallback_polite_msg_uz TEXT NOT NULL,
        fallback_polite_msg_ru TEXT NOT NULL,
        fallback_polite_msg_en TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS banners (
        id TEXT PRIMARY KEY,
        title_uz TEXT NOT NULL,
        title_ru TEXT NOT NULL,
        title_en TEXT NOT NULL,
        subtitle_uz TEXT NOT NULL,
        subtitle_ru TEXT NOT NULL,
        subtitle_en TEXT NOT NULL,
        badge_text TEXT NOT NULL,
        cta_link TEXT NOT NULL,
        image_url TEXT NOT NULL,
        gradient TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS delivery_zones (
        id TEXT PRIMARY KEY,
        region_code TEXT UNIQUE NOT NULL,
        region_name_uz TEXT NOT NULL,
        region_name_ru TEXT NOT NULL,
        region_name_en TEXT NOT NULL,
        districts_json TEXT NOT NULL,
        fee_uzs BIGINT NOT NULL,
        free_threshold_uzs BIGINT NOT NULL,
        estimated_hours TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE
      );
    `;
    await this.exec(ddl);
  }

  private async seedIfEmpty() {
    const check = await this.query<{ cnt: string }>('SELECT COUNT(*)::text as cnt FROM products');
    if (Number(check.rows[0]?.cnt || 0) > 0) {
      return;
    }
    console.log('[DatabaseService] Seeding initial Uzbekistan Electronics Store data...');

    // 1. Roles & Permissions
    const roles = [
      { id: 'role-super-admin', name: 'SUPER_ADMIN', desc: 'To‘liq tizim va AI boshqaruvi huquqi' },
      { id: 'role-manager', name: 'MANAGER', desc: 'Mahsulotlar, ombor, buyurtmalar va marketing boshqaruvi' },
      { id: 'role-support', name: 'SUPPORT', desc: 'Mijozlar murojaatlari va jonli chat operatori' },
      { id: 'role-customer', name: 'CUSTOMER', desc: 'Ro‘yxatdan o‘tgan do‘kon xaridori' },
    ];
    for (const r of roles) {
      await this.query(
        'INSERT INTO roles (id, name, description) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
        [r.id, r.name, r.desc],
      );
    }

    const perms = [
      { id: 'perm-products', code: 'manage_products', desc: 'Mahsulot va omborni boshqarish' },
      { id: 'perm-orders', code: 'manage_orders', desc: 'Buyurtmalarni boshqarish' },
      { id: 'perm-customers', code: 'manage_customers', desc: 'Mijozlar va chatni boshqarish' },
      { id: 'perm-marketing', code: 'manage_marketing', desc: 'Banner va kuponlarni boshqarish' },
      { id: 'perm-ai', code: 'manage_ai', desc: 'AI sozlamalari va limitlarni boshqarish' },
      { id: 'perm-analytics', code: 'view_analytics', desc: 'Savdo analitikasini ko‘rish' },
    ];
    for (const p of perms) {
      await this.query(
        'INSERT INTO permissions (id, code, description) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING',
        [p.id, p.code, p.desc],
      );
      await this.query(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        ['role-super-admin', p.id],
      );
    }
    // Manager permissions
    for (const pid of ['perm-products', 'perm-orders', 'perm-marketing', 'perm-analytics', 'perm-customers']) {
      await this.query(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        ['role-manager', pid],
      );
    }
    // Support permissions
    for (const pid of ['perm-customers', 'perm-orders']) {
      await this.query(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        ['role-support', pid],
      );
    }

    // 2. Admins & Sample User
    const superEmail = process.env.ADMIN_SUPER_EMAIL || 'superadmin@techpulse.uz';
    const superPass = process.env.ADMIN_SUPER_PASSWORD || 'Admin@2026!';
    const superPhone = process.env.ADMIN_SUPER_PHONE || '+998900000001';

    const managerEmail = process.env.ADMIN_MANAGER_EMAIL || 'manager@techpulse.uz';
    const managerPass = process.env.ADMIN_MANAGER_PASSWORD || 'Manager@2026!';
    const managerPhone = process.env.ADMIN_MANAGER_PHONE || '+998900000002';

    const supportEmail = process.env.ADMIN_SUPPORT_EMAIL || 'support@techpulse.uz';
    const supportPass = process.env.ADMIN_SUPPORT_PASSWORD || 'Support@2026!';
    const supportPhone = process.env.ADMIN_SUPPORT_PHONE || '+998900000003';

    await this.query(
      `INSERT INTO admins (id, full_name, email, phone, password_hash, role_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, phone = EXCLUDED.phone`,
      ['adm-1', 'Asadullo Super Admin', superEmail, superPhone, hashPassword(superPass), 'role-super-admin'],
    );
    await this.query(
      `INSERT INTO admins (id, full_name, email, phone, password_hash, role_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, phone = EXCLUDED.phone`,
      ['adm-2', 'Sardor Savdo Menejeri', managerEmail, managerPhone, hashPassword(managerPass), 'role-manager'],
    );
    await this.query(
      `INSERT INTO admins (id, full_name, email, phone, password_hash, role_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, phone = EXCLUDED.phone`,
      ['adm-3', 'Madina Support Operatori', supportEmail, supportPhone, hashPassword(supportPass), 'role-support'],
    );

    await this.query(
      `INSERT INTO users (id, full_name, phone, email, password_hash, language, role_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (phone) DO NOTHING`,
      ['usr-demo-1', 'Jasurbek Karimov', '+998901234567', 'jasur@example.uz', hashPassword('User@2026!'), 'uz', 'role-customer'],
    );

    await this.query(
      `INSERT INTO addresses (id, user_id, title, region, district, street, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
      ['addr-1', 'usr-demo-1', 'Uy manzilim', 'Toshkent shahri', 'Yunusobod', 'Amir Temur shoh ko‘chasi, 108-uy, 45-xonadon', true],
    );

    // 3. Categories & Brands
    const catMap = new Map<string, string>();
    for (const c of SEED_CATEGORIES) {
      catMap.set(c.slug, c.id);
      await this.query(
        `INSERT INTO categories (id, slug, name_uz, name_ru, name_en, icon, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (slug) DO NOTHING`,
        [c.id, c.slug, c.nameUz, c.nameRu, c.nameEn, c.icon, c.description],
      );
    }

    const brandMap = new Map<string, string>();
    for (const b of SEED_BRANDS) {
      brandMap.set(b.slug, b.id);
      await this.query(
        `INSERT INTO brands (id, slug, name, country, is_featured)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (slug) DO NOTHING`,
        [b.id, b.slug, b.name, b.country, b.isFeatured],
      );
    }

    // 4. Products, Images, Specifications, Inventory, Reviews
    for (const p of SEED_PRODUCTS) {
      const catId = catMap.get(p.categorySlug) || SEED_CATEGORIES[0].id;
      const brandId = brandMap.get(p.brandSlug) || SEED_BRANDS[0].id;
      await this.query(
        `INSERT INTO products (
          id, slug, sku, name_uz, name_ru, name_en,
          short_desc_uz, short_desc_ru, short_desc_en,
          description_uz, description_ru, description_en,
          price_uzs, old_price_uzs, discount_percent,
          category_id, brand_id, component_type,
          rating, reviews_count, sales_count,
          is_featured, is_new, is_best_seller, is_gaming,
          warranty_months, seo_title, seo_description
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9,
          $10, $11, $12,
          $13, $14, $15,
          $16, $17, $18,
          $19, $20, $21,
          $22, $23, $24, $25,
          $26, $27, $28
        ) ON CONFLICT (slug) DO NOTHING`,
        [
          p.id, p.slug, p.sku, p.nameUz, p.nameRu, p.nameEn,
          p.shortDescUz, p.shortDescRu, p.shortDescEn,
          p.descriptionUz, p.descriptionRu, p.descriptionEn,
          p.priceUzs, p.oldPriceUzs, p.discountPercent,
          catId, brandId, p.componentType,
          p.rating, p.reviewsCount, p.salesCount,
          p.isFeatured, p.isNew, p.isBestSeller, p.isGaming,
          p.warrantyMonths, `${p.nameUz} — TECHPULSE.UZ`, p.shortDescUz,
        ],
      );

      for (let i = 0; i < p.images.length; i++) {
        await this.query(
          `INSERT INTO product_images (id, product_id, url, alt_text, is_primary, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
          [`img-${p.id}-${i}`, p.id, p.images[i], p.nameUz, i === 0, i],
        );
      }

      for (let i = 0; i < p.specs.length; i++) {
        const s = p.specs[i];
        await this.query(
          `INSERT INTO product_specifications (id, product_id, key, label_uz, label_ru, label_en, value)
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
          [`spec-${p.id}-${i}`, p.id, s.key, s.labelUz, s.labelRu, s.labelEn, s.value],
        );
      }

      await this.query(
        `INSERT INTO inventory (id, product_id, stock_quantity, reserved_quantity, low_stock_threshold, in_stock)
         VALUES ($1, $2, $3, 0, 5, $4) ON CONFLICT (product_id) DO NOTHING`,
        [`inv-${p.id}`, p.id, p.stockQuantity, p.stockQuantity > 0],
      );
    }

    // Sample verified customer reviews
    const sampleReviews = [
      {
        id: 'rev-1',
        productId: 'prod-pc-cyberpulse-pro',
        authorName: 'Javohir Tursunov (Toshkent)',
        rating: 5,
        comment: 'CS2 da 320+ FPS, PUBG Ultra sozlamada 210 FPS berdi! Kabel-menejment juda toza yig‘ilgan, 3 soatda uyimga olib kelib berishdi.',
        pros: 'Yuqori FPS, jimjit ishlashi, 2 yil rasmiy kafolat',
        cons: 'Yo‘q',
      },
      {
        id: 'rev-2',
        productId: 'prod-gpu-rtx-4060',
        authorName: 'Bekzod Alimov (Samarqand)',
        rating: 5,
        comment: 'Eski GTX 1660 Super o‘rniga oldim, DLSS 3 bilan Cyberpunk va GTA V da osmon bilan yercha farq bor. Harorati 63 gradusdan oshmaydi.',
        pros: 'Kam quvvat sarfi (115W), sovuq va kuchli',
        cons: 'Yo‘q',
      },
      {
        id: 'rev-3',
        productId: 'prod-laptop-asus-rog-strix-g16',
        authorName: 'Dilshod Raximov (Buxoro)',
        rating: 5,
        comment: 'Dasturlash va 3D render uchun oldim. Ekran 165Hz juda yorqin, sovutish tizimi a’lo darajada.',
        pros: 'Kuchli i7-13650HX, 140W RTX 4060',
        cons: 'Zaryadnik biroz og‘irroq',
      },
    ];
    for (const r of sampleReviews) {
      await this.query(
        `INSERT INTO reviews (id, product_id, user_id, author_name, rating, comment, pros, cons, is_verified)
         VALUES ($1, $2, 'usr-demo-1', $3, $4, $5, $6, $7, true) ON CONFLICT DO NOTHING`,
        [r.id, r.productId, r.authorName, r.rating, r.comment, r.pros, r.cons],
      );
    }

    // 5. Delivery Zones
    for (const z of SEED_DELIVERY_ZONES) {
      await this.query(
        `INSERT INTO delivery_zones (id, region_code, region_name_uz, region_name_ru, region_name_en, districts_json, fee_uzs, free_threshold_uzs, estimated_hours)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (region_code) DO NOTHING`,
        [
          z.id,
          z.regionCode,
          z.regionNameUz,
          z.regionNameRu,
          z.regionNameEn,
          JSON.stringify(z.districts),
          z.feeUzs,
          z.freeThresholdUzs,
          z.estimatedHours,
        ],
      );
    }

    // 6. Banners & Coupons
    for (const b of SEED_BANNERS) {
      await this.query(
        `INSERT INTO banners (id, title_uz, title_ru, title_en, subtitle_uz, subtitle_ru, subtitle_en, badge_text, cta_link, image_url, gradient, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT DO NOTHING`,
        [
          b.id, b.titleUz, b.titleRu, b.titleEn,
          b.subtitleUz, b.subtitleRu, b.subtitleEn,
          b.badgeText, b.ctaLink, b.imageUrl, b.gradient, b.sortOrder,
        ],
      );
    }

    const coupons = [
      {
        id: 'cpn-techpulse10',
        code: 'TECHPULSE10',
        desc: 'Barcha mahsulotlarga 10% chegirma (maks. 1 000 000 so‘m)',
        percent: 10,
        maxUzs: 1000000,
        minUzs: 1500000,
      },
      {
        id: 'cpn-gamer5',
        code: 'GAMER5',
        desc: 'Gaming kompyuter va aksessuarlarga 5% chegirma (maks. 750 000 so‘m)',
        percent: 5,
        maxUzs: 750000,
        minUzs: 1000000,
      },
    ];
    for (const c of coupons) {
      await this.query(
        `INSERT INTO coupons (id, code, description, discount_percent, max_discount_uzs, min_order_uzs, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '180 days') ON CONFLICT (code) DO NOTHING`,
        [c.id, c.code, c.desc, c.percent, c.maxUzs, c.minUzs],
      );
    }

    // 7. AI Settings
    await this.query(
      `INSERT INTO ai_settings (
        id, is_enabled, provider, model_name, daily_free_limit, daily_used_count,
        system_prompt, knowledge_base, handoff_keywords,
        fallback_polite_msg_uz, fallback_polite_msg_ru, fallback_polite_msg_en
      ) VALUES ($1, true, 'hybrid-db', 'gemini-2.5-flash', 500, 0, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING`,
      [
        'default',
        'Sen TECHPULSE.UZ onlayn elektronika do‘konining rasmiy AI texnik maslahatchisi va virtual menejerisan. Faqat PostgreSQL bazasidagi haqiqiy mahsulotlar va UZS narxlardan foydalan.',
        'Yetkazib berish: Toshkent shahrida 2-4 soatda bepul (500 000 so‘mdan yuqori xaridlarga), viloyatlarga 24-48 soat ichida. Rasmiy kafolat: 12 oydan 36 oygacha. To‘lov usullari: Naqd, Click, Payme, Uzum Bank. Manzil: Toshkent sh., Yunusobod tumani, Amir Temur ko‘chasi 108.',
        'operator,inson,menejer,shikoyat,qaytarish,operatorga ulash,оператор,человек,возврат,human,agent',
        'Hurmatli mijoz, hozirda AI maslahatchimizning kunlik bepul so‘rovlar limiti yakunlandi. Sizga jonli operatorimiz darhol yordam beradi yoki +998 (71) 200-88-99 raqamiga murojaat qilishingiz mumkin.',
        'Уважаемый клиент, дневной лимит бесплатных запросов ИИ исчерпан. Наш оператор с радостью поможет вам в чате!',
        'Dear customer, our daily free AI consultation limit has been reached. A live support specialist will assist you shortly.',
      ],
    );

    // 8. Sample initial Order so Analytics Dashboard has immediate live data
    await this.query(
      `INSERT INTO orders (
        id, order_number, user_id, customer_name, customer_phone,
        region, district, address, comment, status,
        subtotal_uzs, delivery_fee_uzs, discount_uzs, total_uzs,
        payment_method, payment_status, tracking_code
      ) VALUES (
        'ord-seed-1', 'TP-2026-1001', 'usr-demo-1', 'Jasurbek Karimov', '+998901234567',
        'Toshkent shahri', 'Yunusobod', 'Amir Temur shoh ko‘chasi 108-uy', 'Tezroq yetkazib bering',
        'DELIVERED', 11850000, 0, 0, 11850000, 'CLICK', 'PAID', 'UZ-EXP-1001'
      ) ON CONFLICT DO NOTHING`,
    );
    await this.query(
      `INSERT INTO order_items (id, order_id, product_id, product_name, price_uzs, quantity, total_uzs)
       VALUES ('oi-seed-1', 'ord-seed-1', 'prod-pc-cyberpulse-pro', 'Gaming PK TECHPULSE CyberPro (Ryzen 5 7500F / RTX 4060 8GB / 32GB DDR5 / 1TB NVMe)', 11850000, 1, 11850000)
       ON CONFLICT DO NOTHING`,
    );
    await this.query(
      `INSERT INTO payments (id, order_id, provider, amount_uzs, status, external_tx_id, signature_verified, paid_at)
       VALUES ('pay-seed-1', 'ord-seed-1', 'CLICK', 11850000, 'PAID', 'CLICK-TX-90001', true, NOW())
       ON CONFLICT DO NOTHING`,
    );

    console.log('[DatabaseService] Seed completed successfully.');
  }
}

