import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../prisma/database.service';
import { TelegramService } from '../telegram/telegram.service';
import { Permissions, Roles, RolesGuard } from '../common/auth.guard';
import { sanitizeText } from '../common/security.util';

@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN', 'MANAGER', 'SUPPORT')
@Controller('admin')
export class AdminController {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(TelegramService) private readonly telegram: TelegramService,
  ) {}

  @Get('overview')
  async getDashboardOverview() {
    const [
      ordersStat,
      dailyStat,
      productsStat,
      lowStockStat,
      customersStat,
      topProducts,
      recentOrders,
      notifications,
      rolesList,
    ] = await Promise.all([
      this.db.query(`
        SELECT COUNT(*)::int as total_orders,
               COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total_uzs ELSE 0 END), 0)::bigint as total_revenue,
               COUNT(CASE WHEN status = 'NEW' THEN 1 END)::int as new_orders_count,
               COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END)::int as cancelled_orders_count
        FROM orders
      `),
      this.db.query(`
        SELECT COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '1 day' AND status != 'CANCELLED' THEN total_uzs ELSE 0 END), 0)::bigint as daily_revenue,
               COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' AND status != 'CANCELLED' THEN total_uzs ELSE 0 END), 0)::bigint as monthly_revenue
        FROM orders
      `),
      this.db.query(`
        SELECT COUNT(*)::int as total_products,
               COALESCE(SUM(i.stock_quantity), 0)::int as total_stock_units
        FROM products p
        LEFT JOIN inventory i ON i.product_id = p.id
        WHERE p.is_active = true
      `),
      this.db.query(`
        SELECT p.id, p.name_uz, p.sku, i.stock_quantity
        FROM inventory i
        JOIN products p ON p.id = i.product_id
        WHERE p.is_active = true AND i.stock_quantity <= i.low_stock_threshold
        ORDER BY i.stock_quantity ASC
      `),
      this.db.query(`SELECT COUNT(*)::int as total_customers FROM users`),
      this.db.query(`
        SELECT p.id, p.name_uz, p.slug, p.price_uzs, p.sales_count, COALESCE(i.stock_quantity, 0) as stock_quantity
        FROM products p
        LEFT JOIN inventory i ON i.product_id = p.id
        WHERE p.is_active = true
        ORDER BY p.sales_count DESC
        LIMIT 6
      `),
      this.db.query(`
        SELECT id, order_number, customer_name, customer_phone, region, district,
               status, payment_method, payment_status, total_uzs, created_at
        FROM orders
        ORDER BY created_at DESC
        LIMIT 15
      `),
      this.db.query(`
        SELECT id, target, type, title, message, is_read, created_at
        FROM notifications
        ORDER BY created_at DESC
        LIMIT 15
      `),
      this.db.query(`
        SELECT r.id, r.name, r.description,
                COALESCE(json_agg(p.code) FILTER (WHERE p.code IS NOT NULL), '[]') as permissions
        FROM roles r
        LEFT JOIN role_permissions rp ON rp.role_id = r.id
        LEFT JOIN permissions p ON p.id = rp.permission_id
        GROUP BY r.id
      `),
    ]);

    const ordRow = ordersStat.rows[0] || {};
    const dayRow = dailyStat.rows[0] || {};
    const prodRow = productsStat.rows[0] || {};
    const custRow = customersStat.rows[0] || {};

    return {
      metrics: {
        totalRevenueUzs: Number(ordRow.total_revenue || 0),
        dailyRevenueUzs: Number(dayRow.daily_revenue || 0),
        monthlyRevenueUzs: Number(dayRow.monthly_revenue || 0),
        totalOrders: Number(ordRow.total_orders || 0),
        newOrdersCount: Number(ordRow.new_orders_count || 0),
        cancelledOrdersCount: Number(ordRow.cancelled_orders_count || 0),
        totalProducts: Number(prodRow.total_products || 0),
        totalStockUnits: Number(prodRow.total_stock_units || 0),
        lowStockCount: lowStockStat.rows.length,
        totalCustomers: Number(custRow.total_customers || 0),
      },
      lowStockProducts: lowStockStat.rows.map((r) => ({
        id: r.id,
        nameUz: r.name_uz,
        sku: r.sku,
        stockQuantity: Number(r.stock_quantity),
      })),
      topSellingProducts: topProducts.rows.map((p) => ({
        id: p.id,
        nameUz: p.name_uz,
        slug: p.slug,
        priceUzs: Number(p.price_uzs),
        salesCount: Number(p.sales_count),
        stockQuantity: Number(p.stock_quantity),
      })),
      recentOrders: recentOrders.rows.map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        region: o.region,
        district: o.district,
        status: o.status,
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
        totalUzs: Number(o.total_uzs),
        createdAt: o.created_at,
      })),
      notifications: notifications.rows,
      roles: rolesList.rows,
    };
  }

  // ==================== MAHSULOT VA OMBOR BOSHQARUVI ====================
  @Permissions('manage_products')
  @Post('products')
  async createProduct(
    @Body()
    body: {
      nameUz: string;
      nameRu?: string;
      nameEn?: string;
      shortDescUz?: string;
      descriptionUz?: string;
      priceUzs: number;
      oldPriceUzs?: number;
      categoryId: string;
      brandId: string;
      componentType?: string;
      stockQuantity: number;
      imageUrl?: string;
      isGaming?: boolean;
      isFeatured?: boolean;
      specifications?: Array<{ key: string; labelUz: string; value: string }>;
    },
  ) {
    const nameUz = sanitizeText(body.nameUz);
    const priceUzs = Number(body.priceUzs || 0);
    if (!nameUz || priceUzs <= 0) {
      throw new BadRequestException('Mahsulot nomi va UZS narxi to‘g‘ri kiritilishi shart');
    }

    const id = `prod-${crypto.randomUUID().slice(0, 8)}`;
    const slug =
      nameUz
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      crypto.randomUUID().slice(0, 4);
    const sku = `TP-${Math.floor(10000 + Math.random() * 90000)}`;
    const oldPriceUzs = body.oldPriceUzs ? Number(body.oldPriceUzs) : null;
    const discountPercent =
      oldPriceUzs && oldPriceUzs > priceUzs
        ? Math.round(((oldPriceUzs - priceUzs) / oldPriceUzs) * 100)
        : 0;
    const stockQty = Math.max(0, Number(body.stockQuantity ?? 10));

    await this.db.withTransaction(async (tx) => {
      await tx.query(
        `INSERT INTO products (
          id, slug, sku, name_uz, name_ru, name_en,
          short_desc_uz, short_desc_ru, short_desc_en,
          description_uz, description_ru, description_en,
          price_uzs, old_price_uzs, discount_percent,
          category_id, brand_id, component_type,
          is_featured, is_new, is_gaming, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $7, $7,
          $8, $8, $8,
          $9, $10, $11,
          $12, $13, $14,
          $15, true, $16, true
        )`,
        [
          id,
          slug,
          sku,
          nameUz,
          sanitizeText(body.nameRu || nameUz),
          sanitizeText(body.nameEn || nameUz),
          sanitizeText(body.shortDescUz || nameUz),
          sanitizeText(body.descriptionUz || nameUz),
          priceUzs,
          oldPriceUzs,
          discountPercent,
          body.categoryId,
          body.brandId,
          body.componentType || 'PERIPHERAL',
          Boolean(body.isFeatured ?? true),
          Boolean(body.isGaming ?? true),
        ],
      );

      const imgUrl =
        body.imageUrl && body.imageUrl.trim()
          ? sanitizeText(body.imageUrl)
          : 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=900&q=80';
      await tx.query(
        `INSERT INTO product_images (id, product_id, url, alt_text, is_primary, sort_order)
         VALUES ($1, $2, $3, $4, true, 0)`,
        [`img-${id}`, id, imgUrl, nameUz],
      );

      await tx.query(
        `INSERT INTO inventory (id, product_id, stock_quantity, reserved_quantity, low_stock_threshold, in_stock)
         VALUES ($1, $2, $3, 0, 5, $4)`,
        [`inv-${id}`, id, stockQty, stockQty > 0],
      );

      if (Array.isArray(body.specifications)) {
        for (let i = 0; i < body.specifications.length; i++) {
          const sp = body.specifications[i];
          if (sp.key && sp.value) {
            await tx.query(
              `INSERT INTO product_specifications (id, product_id, key, label_uz, label_ru, label_en, value)
               VALUES ($1, $2, $3, $4, $4, $4, $5)`,
              [
                `spec-${id}-${i}`,
                id,
                sanitizeText(sp.key),
                sanitizeText(sp.labelUz || sp.key),
                sanitizeText(sp.value),
              ],
            );
          }
        }
      }
    });

    return { id, slug, sku, priceUzs, stockQuantity: stockQty, success: true };
  }

  @Permissions('manage_products')
  @Put('products/:id')
  async updateProduct(
    @Param('id') id: string,
    @Body()
    body: {
      nameUz?: string;
      priceUzs?: number;
      oldPriceUzs?: number | null;
      stockQuantity?: number;
      isFeatured?: boolean;
      isGaming?: boolean;
    },
  ) {
    const existing = await this.db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      throw new NotFoundException('Mahsulot topilmadi');
    }
    const p = existing.rows[0];
    const newName = body.nameUz ? sanitizeText(body.nameUz) : p.name_uz;
    const newPrice = body.priceUzs !== undefined ? Number(body.priceUzs) : Number(p.price_uzs);
    const newOldPrice =
      body.oldPriceUzs !== undefined
        ? body.oldPriceUzs
          ? Number(body.oldPriceUzs)
          : null
        : p.old_price_uzs
        ? Number(p.old_price_uzs)
        : null;
    const discountPercent =
      newOldPrice && newOldPrice > newPrice
        ? Math.round(((newOldPrice - newPrice) / newOldPrice) * 100)
        : 0;

    await this.db.withTransaction(async (tx) => {
      await tx.query(
        `UPDATE products
         SET name_uz = $1, price_uzs = $2, old_price_uzs = $3, discount_percent = $4,
             is_featured = COALESCE($5, is_featured),
             is_gaming = COALESCE($6, is_gaming),
             updated_at = NOW()
         WHERE id = $7`,
        [
          newName,
          newPrice,
          newOldPrice,
          discountPercent,
          body.isFeatured !== undefined ? Boolean(body.isFeatured) : null,
          body.isGaming !== undefined ? Boolean(body.isGaming) : null,
          id,
        ],
      );

      if (body.stockQuantity !== undefined) {
        const qty = Math.max(0, Number(body.stockQuantity));
        await tx.query(
          `UPDATE inventory SET stock_quantity = $1, in_stock = $2, updated_at = NOW() WHERE product_id = $3`,
          [qty, qty > 0, id],
        );
      }
    });

    return { id, priceUzs: newPrice, discountPercent, success: true };
  }

  @Permissions('manage_products')
  @Delete('products/:id')
  async deleteProduct(@Param('id') id: string) {
    await this.db.query('UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1', [
      id,
    ]);
    await this.db.query('UPDATE inventory SET stock_quantity = 0, in_stock = false WHERE product_id = $1', [
      id,
    ]);
    return { id, deleted: true };
  }

  @Permissions('manage_products')
  @Post('categories')
  async createCategory(
    @Body() body: { nameUz: string; nameRu?: string; nameEn?: string; icon?: string; description?: string },
  ) {
    const nameUz = sanitizeText(body.nameUz);
    if (!nameUz) throw new BadRequestException('Kategoriya nomini kiriting');
    const id = `cat-${crypto.randomUUID().slice(0, 8)}`;
    const slug = nameUz.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await this.db.query(
      `INSERT INTO categories (id, slug, name_uz, name_ru, name_en, icon, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        slug,
        nameUz,
        sanitizeText(body.nameRu || nameUz),
        sanitizeText(body.nameEn || nameUz),
        sanitizeText(body.icon || 'Cpu'),
        sanitizeText(body.description || ''),
      ],
    );
    return { id, slug, nameUz, success: true };
  }

  @Permissions('manage_products')
  @Post('brands')
  async createBrand(@Body() body: { name: string; country?: string }) {
    const name = sanitizeText(body.name);
    if (!name) throw new BadRequestException('Brend nomini kiriting');
    const id = `br-${crypto.randomUUID().slice(0, 8)}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await this.db.query(
      `INSERT INTO brands (id, slug, name, country, is_featured) VALUES ($1, $2, $3, $4, true)`,
      [id, slug, name, sanitizeText(body.country || '')],
    );
    return { id, slug, name, success: true };
  }

  // ==================== BUYURTMALAR BOSHQARUVI ====================
  @Permissions('manage_orders')
  @Get('orders')
  async getAllOrders() {
    const res = await this.db.query(`
      SELECT * FROM orders ORDER BY created_at DESC
    `);
    const orders = [];
    for (const o of res.rows) {
      const itemsRes = await this.db.query('SELECT * FROM order_items WHERE order_id = $1', [o.id]);
      orders.push({
        id: o.id,
        orderNumber: o.order_number,
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        region: o.region,
        district: o.district,
        address: o.address,
        comment: o.comment,
        status: o.status,
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
        trackingCode: o.tracking_code,
        subtotalUzs: Number(o.subtotal_uzs),
        deliveryFeeUzs: Number(o.delivery_fee_uzs),
        discountUzs: Number(o.discount_uzs),
        totalUzs: Number(o.total_uzs),
        createdAt: o.created_at,
        items: itemsRes.rows.map((i) => ({
          id: i.id,
          productId: i.product_id,
          productName: i.product_name,
          priceUzs: Number(i.price_uzs),
          quantity: Number(i.quantity),
          totalUzs: Number(i.total_uzs),
        })),
      });
    }
    return orders;
  }

  @Permissions('manage_orders')
  @Put('orders/:id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() body: { status: string; paymentStatus?: string },
  ) {
    const validStatuses = ['NEW', 'CONFIRMED', 'PREPARING', 'SHIPPING', 'DELIVERED', 'CANCELLED'];
    const newStatus = (body.status || '').toUpperCase();
    if (!validStatuses.includes(newStatus)) {
      throw new BadRequestException('Noto‘g‘ri buyurtma holati');
    }

    const ordRes = await this.db.query('SELECT * FROM orders WHERE id = $1', [id]);
    const ord = ordRes.rows[0];
    if (!ord) throw new NotFoundException('Buyurtma topilmadi');

    await this.db.withTransaction(async (tx) => {
      // Restore stock if transitioning to CANCELLED
      if (newStatus === 'CANCELLED' && ord.status !== 'CANCELLED') {
        const itemsRes = await tx.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
        for (const item of itemsRes.rows) {
          await tx.query(
            `UPDATE inventory SET stock_quantity = stock_quantity + $1, in_stock = true, updated_at = NOW()
             WHERE product_id = $2`,
            [Number(item.quantity), item.product_id],
          );
        }
      }

      await tx.query(
        `UPDATE orders
         SET status = $1,
             payment_status = COALESCE($2, payment_status),
             updated_at = NOW()
         WHERE id = $3`,
        [newStatus, body.paymentStatus || null, id],
      );
    });

    await this.telegram.notifyOrderStatusChanged({
      userId: ord.user_id,
      orderNumber: ord.order_number,
      customerName: ord.customer_name,
      status: newStatus,
      trackingCode: ord.tracking_code,
    });

    return { id, orderNumber: ord.order_number, status: newStatus, success: true };
  }

  // ==================== MIJOZLAR, CHAT VA SUPPORT TICKETLAR ====================
  @Permissions('manage_customers')
  @Get('customers')
  async getCustomers() {
    const res = await this.db.query(`
      SELECT u.id, u.full_name, u.phone, u.email, u.language, u.is_active, u.created_at,
             COUNT(o.id)::int as orders_count,
             COALESCE(SUM(o.total_uzs), 0)::bigint as total_spent_uzs
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id OR o.customer_phone = u.phone
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    return res.rows.map((u) => ({
      id: u.id,
      fullName: u.full_name,
      phone: u.phone,
      email: u.email,
      language: u.language,
      isActive: u.is_active,
      ordersCount: Number(u.orders_count || 0),
      totalSpentUzs: Number(u.total_spent_uzs || 0),
      createdAt: u.created_at,
    }));
  }

  @Permissions('manage_customers')
  @Get('conversations')
  async getConversations() {
    const convs = await this.db.query(`
      SELECT * FROM conversations ORDER BY updated_at DESC LIMIT 30
    `);
    const result = [];
    for (const c of convs.rows) {
      const msgs = await this.db.query(
        `SELECT id, sender_type, sender_name, content, created_at
         FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
        [c.id],
      );
      result.push({
        id: c.id,
        sessionKey: c.session_key,
        customerName: c.customer_name,
        customerPhone: c.customer_phone,
        language: c.language,
        mode: c.mode,
        status: c.status,
        updatedAt: c.updated_at,
        messages: msgs.rows.map((m) => ({
          id: m.id,
          senderType: m.sender_type,
          senderName: m.sender_name,
          content: m.content,
          createdAt: m.created_at,
        })),
      });
    }
    return result;
  }

  @Permissions('manage_customers')
  @Post('conversations/:id/reply')
  async operatorReply(
    @Param('id') conversationId: string,
    @Body() body: { operatorName?: string; content: string },
  ) {
    const content = sanitizeText(body.content);
    if (!content) throw new BadRequestException('Xabar matnini kiriting');

    const msgId = `msg-${crypto.randomUUID().slice(0, 8)}`;
    await this.db.query(
      `INSERT INTO messages (id, conversation_id, sender_type, sender_name, content)
       VALUES ($1, $2, 'OPERATOR', $3, $4)`,
      [msgId, conversationId, sanitizeText(body.operatorName || 'TECHPULSE Operator'), content],
    );
    await this.db.query(
      `UPDATE conversations SET mode = 'OPERATOR', status = 'ACTIVE', updated_at = NOW() WHERE id = $1`,
      [conversationId],
    );

    return { id: msgId, conversationId, senderType: 'OPERATOR', content, success: true };
  }

  @Permissions('manage_customers')
  @Get('tickets')
  async getTickets() {
    const res = await this.db.query('SELECT * FROM support_tickets ORDER BY created_at DESC');
    return res.rows;
  }

  @Permissions('manage_customers')
  @Put('tickets/:id')
  async updateTicket(
    @Param('id') id: string,
    @Body() body: { status?: string; adminReply?: string },
  ) {
    await this.db.query(
      `UPDATE support_tickets
       SET status = COALESCE($1, status),
           admin_reply = COALESCE($2, admin_reply),
           updated_at = NOW()
       WHERE id = $3`,
      [body.status || null, body.adminReply ? sanitizeText(body.adminReply) : null, id],
    );
    return { id, success: true };
  }

  // ==================== MARKETING BOSHQARUVI ====================
  @Permissions('manage_marketing')
  @Get('coupons')
  async getCoupons() {
    const res = await this.db.query('SELECT * FROM coupons ORDER BY created_at DESC');
    return res.rows.map((c) => ({
      ...c,
      max_discount_uzs: Number(c.max_discount_uzs),
      min_order_uzs: Number(c.min_order_uzs),
    }));
  }

  @Permissions('manage_marketing')
  @Post('coupons')
  async createCoupon(
    @Body()
    body: {
      code: string;
      description: string;
      discountPercent: number;
      maxDiscountUzs: number;
      minOrderUzs: number;
    },
  ) {
    const code = sanitizeText(body.code).toUpperCase();
    if (!code) throw new BadRequestException('Kupon kodini kiriting');
    const id = `cpn-${crypto.randomUUID().slice(0, 8)}`;
    await this.db.query(
      `INSERT INTO coupons (id, code, description, discount_percent, max_discount_uzs, min_order_uzs, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '90 days')`,
      [
        id,
        code,
        sanitizeText(body.description || `${code} promo-kodi`),
        Number(body.discountPercent || 10),
        Number(body.maxDiscountUzs || 500000),
        Number(body.minOrderUzs || 1000000),
      ],
    );
    return { id, code, success: true };
  }

  // ==================== 15. AI MANAGEMENT PANEL ====================
  @Get('ai')
  async getAiManagementData() {
    const [settingsRes, logsRes, statsRes] = await Promise.all([
      this.db.query('SELECT * FROM ai_settings WHERE id = $1', ['default']),
      this.db.query('SELECT * FROM ai_usage_logs ORDER BY created_at DESC LIMIT 30'),
      this.db.query(`
        SELECT COUNT(*)::int as total_requests,
               COALESCE(SUM(tokens_used), 0)::int as total_tokens,
               COALESCE(AVG(latency_ms), 0)::int as avg_latency_ms
        FROM ai_usage_logs
      `),
    ]);

    return {
      settings: settingsRes.rows[0],
      stats: statsRes.rows[0],
      recentLogs: logsRes.rows,
    };
  }

  @Permissions('manage_ai')
  @Put('ai/settings')
  async updateAiSettings(
    @Body()
    body: {
      isEnabled?: boolean;
      provider?: string;
      modelName?: string;
      dailyFreeLimit?: number;
      systemPrompt?: string;
      knowledgeBase?: string;
      handoffKeywords?: string;
      fallbackPoliteMsgUz?: string;
      resetDailyCounter?: boolean;
    },
  ) {
    const currentRes = await this.db.query('SELECT * FROM ai_settings WHERE id = $1', ['default']);
    const cur = currentRes.rows[0];

    await this.db.query(
      `UPDATE ai_settings
       SET is_enabled = $1,
           provider = $2,
           model_name = $3,
           daily_free_limit = $4,
           daily_used_count = $5,
           system_prompt = $6,
           knowledge_base = $7,
           handoff_keywords = $8,
           fallback_polite_msg_uz = $9,
           updated_at = NOW()
       WHERE id = 'default'`,
      [
        body.isEnabled !== undefined ? Boolean(body.isEnabled) : cur.is_enabled,
        body.provider ? sanitizeText(body.provider) : cur.provider,
        body.modelName ? sanitizeText(body.modelName) : cur.model_name,
        body.dailyFreeLimit !== undefined ? Number(body.dailyFreeLimit) : Number(cur.daily_free_limit),
        body.resetDailyCounter ? 0 : Number(cur.daily_used_count),
        body.systemPrompt ? sanitizeText(body.systemPrompt) : cur.system_prompt,
        body.knowledgeBase ? sanitizeText(body.knowledgeBase) : cur.knowledge_base,
        body.handoffKeywords ? sanitizeText(body.handoffKeywords) : cur.handoff_keywords,
        body.fallbackPoliteMsgUz ? sanitizeText(body.fallbackPoliteMsgUz) : cur.fallback_polite_msg_uz,
      ],
    );

    const updated = await this.db.query('SELECT * FROM ai_settings WHERE id = $1', ['default']);
    return { settings: updated.rows[0], success: true };
  }
}
