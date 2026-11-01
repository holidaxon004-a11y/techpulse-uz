import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../prisma/database.service';
import { sanitizeText } from '../common/security.util';

@Controller('catalog')
export class CatalogController {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  private async enrichProducts(rows: any[]) {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const placeholders = ids.map((_, idx) => `$${idx + 1}`).join(',');

    const [imgRes, specRes] = await Promise.all([
      this.db.query(
        `SELECT product_id, url, alt_text, is_primary, sort_order
         FROM product_images WHERE product_id IN (${placeholders}) ORDER BY sort_order ASC`,
        ids,
      ),
      this.db.query(
        `SELECT product_id, key, label_uz, label_ru, label_en, value
         FROM product_specifications WHERE product_id IN (${placeholders})`,
        ids,
      ),
    ]);

    const imgMap = new Map<string, string[]>();
    for (const img of imgRes.rows) {
      const list = imgMap.get(img.product_id) || [];
      list.push(img.url);
      imgMap.set(img.product_id, list);
    }

    const specMap = new Map<string, any[]>();
    for (const sp of specRes.rows) {
      const list = specMap.get(sp.product_id) || [];
      list.push({
        key: sp.key,
        labelUz: sp.label_uz,
        labelRu: sp.label_ru,
        labelEn: sp.label_en,
        value: sp.value,
      });
      specMap.set(sp.product_id, list);
    }

    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      sku: r.sku,
      nameUz: r.name_uz,
      nameRu: r.name_ru,
      nameEn: r.name_en,
      shortDescUz: r.short_desc_uz,
      shortDescRu: r.short_desc_ru,
      shortDescEn: r.short_desc_en,
      descriptionUz: r.description_uz,
      descriptionRu: r.description_ru,
      descriptionEn: r.description_en,
      priceUzs: Number(r.price_uzs),
      oldPriceUzs: r.old_price_uzs ? Number(r.old_price_uzs) : null,
      discountPercent: Number(r.discount_percent || 0),
      categoryId: r.category_id,
      categorySlug: r.category_slug,
      categoryNameUz: r.category_name_uz,
      categoryNameRu: r.category_name_ru,
      categoryNameEn: r.category_name_en,
      brandId: r.brand_id,
      brandSlug: r.brand_slug,
      brandName: r.brand_name,
      componentType: r.component_type,
      rating: Number(r.rating || 4.8),
      reviewsCount: Number(r.reviews_count || 0),
      salesCount: Number(r.sales_count || 0),
      isFeatured: Boolean(r.is_featured),
      isNew: Boolean(r.is_new),
      isBestSeller: Boolean(r.is_best_seller),
      isGaming: Boolean(r.is_gaming),
      warrantyMonths: Number(r.warranty_months || 12),
      stockQuantity: Number(r.stock_quantity ?? 0),
      inStock: Number(r.stock_quantity ?? 0) > 0 && Boolean(r.in_stock ?? true),
      images: imgMap.get(r.id) || [
        'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=80',
      ],
      specifications: specMap.get(r.id) || [],
    }));
  }

  private get baseProductSelect(): string {
    return `
      SELECT p.*,
             c.slug as category_slug, c.name_uz as category_name_uz, c.name_ru as category_name_ru, c.name_en as category_name_en,
             b.slug as brand_slug, b.name as brand_name,
             i.stock_quantity, i.in_stock
      FROM products p
      JOIN categories c ON c.id = p.category_id
      JOIN brands b ON b.id = p.brand_id
      LEFT JOIN inventory i ON i.product_id = p.id
    `;
  }

  @Get('home')
  async getHomeData() {
    const [bannersRes, categoriesRes, brandsRes, allProductsRes, reviewsRes] = await Promise.all([
      this.db.query('SELECT * FROM banners WHERE is_active = true ORDER BY sort_order ASC'),
      this.db.query(`
        SELECT c.*, COUNT(p.id)::int as product_count
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
        GROUP BY c.id
        ORDER BY c.name_uz ASC
      `),
      this.db.query('SELECT * FROM brands WHERE is_featured = true ORDER BY name ASC'),
      this.db.query(`${this.baseProductSelect} WHERE p.is_active = true ORDER BY p.sales_count DESC`),
      this.db.query(`
        SELECT r.*, p.name_uz as product_name_uz, p.slug as product_slug
        FROM reviews r
        JOIN products p ON p.id = r.product_id
        ORDER BY r.created_at DESC
        LIMIT 6
      `),
    ]);

    const products = await this.enrichProducts(allProductsRes.rows);

    return {
      banners: bannersRes.rows.map((b) => ({
        id: b.id,
        titleUz: b.title_uz,
        titleRu: b.title_ru,
        titleEn: b.title_en,
        subtitleUz: b.subtitle_uz,
        subtitleRu: b.subtitle_ru,
        subtitleEn: b.subtitle_en,
        badgeText: b.badge_text,
        ctaLink: b.cta_link,
        imageUrl: b.image_url,
        gradient: b.gradient,
      })),
      categories: categoriesRes.rows.map((c) => ({
        id: c.id,
        slug: c.slug,
        nameUz: c.name_uz,
        nameRu: c.name_ru,
        nameEn: c.name_en,
        icon: c.icon,
        description: c.description,
        productCount: Number(c.product_count || 0),
      })),
      brands: brandsRes.rows.map((b) => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        country: b.country,
      })),
      promotions: products.filter((p) => p.discountPercent >= 8).slice(0, 8),
      bestSellers: products.filter((p) => p.isBestSeller).slice(0, 8),
      newArrivals: products.filter((p) => p.isNew).slice(0, 8),
      featured: products.filter((p) => p.isFeatured).slice(0, 8),
      gamingProducts: products.filter((p) => p.isGaming).slice(0, 8),
      reviews: reviewsRes.rows.map((r) => ({
        id: r.id,
        authorName: r.author_name,
        rating: Number(r.rating),
        comment: r.comment,
        pros: r.pros,
        cons: r.cons,
        productNameUz: r.product_name_uz,
        productSlug: r.product_slug,
        createdAt: r.created_at,
      })),
    };
  }

  @Get('categories')
  async getCategories() {
    const res = await this.db.query(`
      SELECT c.*, COUNT(p.id)::int as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
      GROUP BY c.id
      ORDER BY c.name_uz ASC
    `);
    return res.rows.map((c) => ({
      id: c.id,
      slug: c.slug,
      nameUz: c.name_uz,
      nameRu: c.name_ru,
      nameEn: c.name_en,
      icon: c.icon,
      description: c.description,
      productCount: Number(c.product_count || 0),
    }));
  }

  @Get('brands')
  async getBrands() {
    const res = await this.db.query('SELECT * FROM brands ORDER BY name ASC');
    return res.rows;
  }

  @Get('delivery-zones')
  async getDeliveryZones() {
    const res = await this.db.query(
      'SELECT * FROM delivery_zones WHERE is_active = true ORDER BY fee_uzs ASC, region_name_uz ASC',
    );
    return res.rows.map((z) => ({
      id: z.id,
      regionCode: z.region_code,
      regionNameUz: z.region_name_uz,
      regionNameRu: z.region_name_ru,
      regionNameEn: z.region_name_en,
      districts: JSON.parse(z.districts_json || '[]'),
      feeUzs: Number(z.fee_uzs),
      freeThresholdUzs: Number(z.free_threshold_uzs),
      estimatedHours: z.estimated_hours,
    }));
  }

  @Get('products')
  async searchProducts(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('brand') brand?: string,
    @Query('componentType') componentType?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minRating') minRating?: string,
    @Query('inStock') inStock?: string,
    @Query('spec') spec?: string,
    @Query('sort') sort?: string,
  ) {
    const conditions: string[] = ['p.is_active = true'];
    const params: any[] = [];

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      const idx = params.length;
      conditions.push(
        `(p.name_uz ILIKE $${idx} OR p.name_ru ILIKE $${idx} OR p.name_en ILIKE $${idx} OR p.sku ILIKE $${idx} OR p.short_desc_uz ILIKE $${idx} OR b.name ILIKE $${idx} OR EXISTS (SELECT 1 FROM product_specifications ps WHERE ps.product_id = p.id AND ps.value ILIKE $${idx}))`,
      );
    }

    if (category && category !== 'all') {
      params.push(category);
      conditions.push(`c.slug = $${params.length}`);
    }

    if (brand && brand !== 'all') {
      params.push(brand);
      conditions.push(`b.slug = $${params.length}`);
    }

    if (componentType && componentType !== 'all') {
      params.push(componentType.toUpperCase());
      conditions.push(`UPPER(p.component_type) = $${params.length}`);
    }

    if (minPrice && !Number.isNaN(Number(minPrice))) {
      params.push(Number(minPrice));
      conditions.push(`p.price_uzs >= $${params.length}`);
    }

    if (maxPrice && !Number.isNaN(Number(maxPrice))) {
      params.push(Number(maxPrice));
      conditions.push(`p.price_uzs <= $${params.length}`);
    }

    if (minRating && !Number.isNaN(Number(minRating))) {
      params.push(Number(minRating));
      conditions.push(`p.rating >= $${params.length}`);
    }

    if (inStock === 'true') {
      conditions.push(`COALESCE(i.stock_quantity, 0) > 0`);
    }

    if (spec && spec.trim()) {
      params.push(`%${spec.trim()}%`);
      conditions.push(
        `EXISTS (SELECT 1 FROM product_specifications ps WHERE ps.product_id = p.id AND (ps.value ILIKE $${params.length} OR ps.key ILIKE $${params.length}))`,
      );
    }

    let orderBy = 'p.sales_count DESC, p.created_at DESC';
    switch (sort) {
      case 'price_asc':
        orderBy = 'p.price_uzs ASC';
        break;
      case 'price_desc':
        orderBy = 'p.price_uzs DESC';
        break;
      case 'newest':
        orderBy = 'p.is_new DESC, p.created_at DESC';
        break;
      case 'rating':
        orderBy = 'p.rating DESC, p.reviews_count DESC';
        break;
      case 'best_selling':
      default:
        orderBy = 'p.sales_count DESC';
        break;
    }

    const sql = `${this.baseProductSelect} WHERE ${conditions.join(' AND ')} ORDER BY ${orderBy}`;
    const res = await this.db.query(sql, params);
    const items = await this.enrichProducts(res.rows);

    return {
      total: items.length,
      items,
    };
  }

  @Get('products/:slug')
  async getProductBySlug(@Param('slug') slug: string) {
    const res = await this.db.query(
      `${this.baseProductSelect} WHERE (p.slug = $1 OR p.id = $1) AND p.is_active = true LIMIT 1`,
      [slug],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException('Mahsulot topilmadi');
    }
    const [product] = await this.enrichProducts(res.rows);

    const [reviewsRes, similarRes] = await Promise.all([
      this.db.query(
        `SELECT id, author_name, rating, comment, pros, cons, is_verified, created_at
         FROM reviews WHERE product_id = $1 ORDER BY created_at DESC`,
        [product.id],
      ),
      this.db.query(
        `${this.baseProductSelect} WHERE p.category_id = $1 AND p.id != $2 AND p.is_active = true ORDER BY p.sales_count DESC LIMIT 4`,
        [product.categoryId, product.id],
      ),
    ]);

    const similarProducts = await this.enrichProducts(similarRes.rows);

    return {
      ...product,
      reviews: reviewsRes.rows.map((r) => ({
        id: r.id,
        authorName: r.author_name,
        rating: Number(r.rating),
        comment: r.comment,
        pros: r.pros,
        cons: r.cons,
        isVerified: Boolean(r.is_verified),
        createdAt: r.created_at,
      })),
      similarProducts,
    };
  }

  @Post('products/:id/reviews')
  async addReview(
    @Param('id') productId: string,
    @Body()
    body: {
      authorName: string;
      rating: number;
      comment: string;
      pros?: string;
      cons?: string;
      userId?: string;
    },
  ) {
    const authorName = sanitizeText(body.authorName || 'Mijoz');
    const comment = sanitizeText(body.comment);
    const rating = Math.min(5, Math.max(1, Number(body.rating || 5)));

    if (!comment) {
      throw new BadRequestException('Sharh matnini kiriting');
    }

    const id = `rev-${crypto.randomUUID().slice(0, 8)}`;
    await this.db.query(
      `INSERT INTO reviews (id, product_id, user_id, author_name, rating, comment, pros, cons, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
      [
        id,
        productId,
        body.userId || null,
        authorName,
        rating,
        comment,
        body.pros ? sanitizeText(body.pros) : null,
        body.cons ? sanitizeText(body.cons) : null,
      ],
    );

    const stats = await this.db.query<{ avg_r: number; cnt: number }>(
      `SELECT ROUND(AVG(rating)::numeric, 1)::float as avg_r, COUNT(*)::int as cnt
       FROM reviews WHERE product_id = $1`,
      [productId],
    );
    const avg = stats.rows[0]?.avg_r || rating;
    const cnt = stats.rows[0]?.cnt || 1;
    await this.db.query(
      `UPDATE products SET rating = $1, reviews_count = $2, updated_at = NOW() WHERE id = $3`,
      [avg, cnt, productId],
    );

    return { id, rating: avg, reviewsCount: cnt, success: true };
  }
}
