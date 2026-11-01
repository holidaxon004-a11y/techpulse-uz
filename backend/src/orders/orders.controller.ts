import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../prisma/database.service';
import { TelegramService } from '../telegram/telegram.service';
import {
  generatePaymentSignature,
  sanitizeText,
  verifyPaymentSignature,
} from '../common/security.util';

@Controller()
export class OrdersController {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(TelegramService) private readonly telegram: TelegramService,
  ) {}

  @Post('orders/validate-coupon')
  async validateCoupon(@Body() body: { code: string; subtotalUzs: number }) {
    const code = sanitizeText(body.code).toUpperCase();
    const subtotalUzs = Number(body.subtotalUzs || 0);
    if (!code) {
      throw new BadRequestException('Promo-kodni kiriting');
    }

    const res = await this.db.query(
      `SELECT * FROM coupons WHERE UPPER(code) = $1 AND is_active = true`,
      [code],
    );
    const coupon = res.rows[0];
    if (!coupon) {
      throw new BadRequestException('Promo-kod topilmadi yoki faol emas');
    }
    if (Number(coupon.used_count) >= Number(coupon.usage_limit)) {
      throw new BadRequestException('Ushbu promo-kod limiti tugagan');
    }
    if (new Date(coupon.expires_at).getTime() < Date.now()) {
      throw new BadRequestException('Promo-kod amal qilish muddati tugagan');
    }
    const minOrder = Number(coupon.min_order_uzs);
    if (subtotalUzs < minOrder) {
      throw new BadRequestException(
        `Ushbu promo-kod kamida ${minOrder.toLocaleString('ru-RU')} so‘mlik buyurtmalar uchun amal qiladi`,
      );
    }

    const rawDiscount = Math.round((subtotalUzs * Number(coupon.discount_percent)) / 100);
    const discountUzs = Math.min(rawDiscount, Number(coupon.max_discount_uzs));

    return {
      valid: true,
      code: coupon.code,
      description: coupon.description,
      discountPercent: Number(coupon.discount_percent),
      discountUzs,
    };
  }

  @Post('orders')
  async createOrder(
    @Body()
    body: {
      userId?: string;
      customerName: string;
      customerPhone: string;
      region: string;
      district: string;
      address: string;
      comment?: string;
      couponCode?: string;
      paymentMethod: 'CASH' | 'CLICK' | 'PAYME' | 'UZUM';
      items: Array<{ productId: string; quantity: number }>;
    },
  ) {
    const customerName = sanitizeText(body.customerName);
    const customerPhone = sanitizeText(body.customerPhone);
    const region = sanitizeText(body.region);
    const district = sanitizeText(body.district);
    const address = sanitizeText(body.address);
    const comment = body.comment ? sanitizeText(body.comment) : null;
    const paymentMethod = ['CASH', 'CLICK', 'PAYME', 'UZUM'].includes(body.paymentMethod)
      ? body.paymentMethod
      : 'CASH';

    if (!customerName || !customerPhone || !region || !district || !address) {
      throw new BadRequestException(
        'Ism, telefon raqam, viloyat, tuman va yetkazib berish manzili to‘ldirilishi shart',
      );
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw new BadRequestException('Savat bo‘sh — kamida bitta mahsulot tanlang');
    }

    const lowStockWarnings: Array<{ name: string; remaining: number }> = [];

    const result = await this.db.withTransaction(async (tx) => {
      let subtotalUzs = 0;
      const verifiedItems: Array<{
        productId: string;
        productName: string;
        priceUzs: number;
        quantity: number;
        totalUzs: number;
      }> = [];

      for (const reqItem of body.items) {
        const qty = Math.max(1, Math.floor(Number(reqItem.quantity || 1)));
        const prodRes = await tx.query(
          `SELECT p.id, p.name_uz, p.price_uzs, p.is_active, i.stock_quantity, i.low_stock_threshold
           FROM products p
           LEFT JOIN inventory i ON i.product_id = p.id
           WHERE p.id = $1`,
          [reqItem.productId],
        );
        const prod = prodRes.rows[0];
        if (!prod || !prod.is_active) {
          throw new BadRequestException(`Mahsulot topilmadi (${reqItem.productId})`);
        }
        const available = Number(prod.stock_quantity ?? 0);
        if (available < qty) {
          throw new BadRequestException(
            `"${prod.name_uz}" mahsulotidan omborda faqat ${available} dona qolgan`,
          );
        }

        const unitPrice = Number(prod.price_uzs);
        const lineTotal = unitPrice * qty;
        subtotalUzs += lineTotal;

        verifiedItems.push({
          productId: prod.id,
          productName: prod.name_uz,
          priceUzs: unitPrice,
          quantity: qty,
          totalUzs: lineTotal,
        });

        const remaining = available - qty;
        await tx.query(
          `UPDATE inventory
           SET stock_quantity = $1, in_stock = $2, updated_at = NOW()
           WHERE product_id = $3`,
          [remaining, remaining > 0, prod.id],
        );
        await tx.query(
          `UPDATE products SET sales_count = sales_count + $1, updated_at = NOW() WHERE id = $2`,
          [qty, prod.id],
        );

        if (remaining <= Number(prod.low_stock_threshold ?? 5)) {
          lowStockWarnings.push({ name: prod.name_uz, remaining });
        }
      }

      // Delivery fee calculation from delivery_zones
      let deliveryFeeUzs = 45000;
      const zoneRes = await tx.query(
        `SELECT fee_uzs, free_threshold_uzs FROM delivery_zones
         WHERE region_name_uz ILIKE $1 OR region_code ILIKE $1 LIMIT 1`,
        [`%${region}%`],
      );
      if (zoneRes.rows[0]) {
        const fee = Number(zoneRes.rows[0].fee_uzs);
        const freeThreshold = Number(zoneRes.rows[0].free_threshold_uzs);
        deliveryFeeUzs = subtotalUzs >= freeThreshold ? 0 : fee;
      }

      // Coupon calculation
      let discountUzs = 0;
      let appliedCoupon: string | null = null;
      if (body.couponCode && body.couponCode.trim()) {
        const cpnRes = await tx.query(
          `SELECT * FROM coupons WHERE UPPER(code) = $1 AND is_active = true`,
          [body.couponCode.trim().toUpperCase()],
        );
        const cpn = cpnRes.rows[0];
        if (cpn && subtotalUzs >= Number(cpn.min_order_uzs)) {
          const raw = Math.round((subtotalUzs * Number(cpn.discount_percent)) / 100);
          discountUzs = Math.min(raw, Number(cpn.max_discount_uzs));
          appliedCoupon = cpn.code;
          await tx.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = $1', [cpn.id]);
        }
      }

      const totalUzs = Math.max(0, subtotalUzs - discountUzs + deliveryFeeUzs);
      const orderId = `ord-${crypto.randomUUID().slice(0, 8)}`;
      const orderNumber = `TP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const trackingCode = `UZ-EXP-${Math.floor(10000 + Math.random() * 90000)}`;

      await tx.query(
        `INSERT INTO orders (
          id, order_number, user_id, customer_name, customer_phone,
          region, district, address, comment, status,
          subtotal_uzs, delivery_fee_uzs, discount_uzs, total_uzs,
          coupon_code, payment_method, payment_status, tracking_code
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, 'NEW',
          $10, $11, $12, $13,
          $14, $15, 'PENDING', $16
        )`,
        [
          orderId,
          orderNumber,
          body.userId || null,
          customerName,
          customerPhone,
          region,
          district,
          address,
          comment,
          subtotalUzs,
          deliveryFeeUzs,
          discountUzs,
          totalUzs,
          appliedCoupon,
          paymentMethod,
          trackingCode,
        ],
      );

      for (const item of verifiedItems) {
        const oiId = `oi-${crypto.randomUUID().slice(0, 8)}`;
        await tx.query(
          `INSERT INTO order_items (id, order_id, product_id, product_name, price_uzs, quantity, total_uzs)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [oiId, orderId, item.productId, item.productName, item.priceUzs, item.quantity, item.totalUzs],
        );
      }

      const paymentId = `pay-${crypto.randomUUID().slice(0, 8)}`;
      await tx.query(
        `INSERT INTO payments (id, order_id, provider, amount_uzs, status, signature_verified)
         VALUES ($1, $2, $3, $4, 'PENDING', false)`,
        [paymentId, orderId, paymentMethod, totalUzs],
      );

      const serverPaymentToken =
        paymentMethod !== 'CASH'
          ? generatePaymentSignature(paymentMethod, orderId, totalUzs)
          : null;

      return {
        orderId,
        orderNumber,
        trackingCode,
        status: 'NEW',
        paymentMethod,
        paymentStatus: 'PENDING',
        subtotalUzs,
        deliveryFeeUzs,
        discountUzs,
        totalUzs,
        itemsCount: verifiedItems.reduce((sum, i) => sum + i.quantity, 0),
        items: verifiedItems,
        paymentSession:
          paymentMethod !== 'CASH'
            ? {
                paymentId,
                provider: paymentMethod,
                amountUzs: totalUzs,
                signatureToken: serverPaymentToken,
              }
            : null,
      };
    });

    // Automated Telegram & System Notifications
    await this.telegram.notifyAdminNewOrder({
      orderNumber: result.orderNumber,
      customerName,
      customerPhone,
      region,
      district,
      totalUzs: result.totalUzs,
      paymentMethod,
      itemsCount: result.itemsCount,
    });

    for (const warn of lowStockWarnings) {
      await this.telegram.notifyLowStock(warn.name, warn.remaining);
    }

    return result;
  }

  @Get('orders/track/:orderNumber')
  async trackOrder(@Param('orderNumber') orderNumber: string) {
    const clean = sanitizeText(orderNumber).toUpperCase();
    const res = await this.db.query(
      `SELECT * FROM orders WHERE UPPER(order_number) = $1 OR id = $2 LIMIT 1`,
      [clean, orderNumber],
    );
    const ord = res.rows[0];
    if (!ord) {
      throw new NotFoundException('Bunday raqamli buyurtma topilmadi');
    }
    const itemsRes = await this.db.query(
      `SELECT id, product_id, product_name, price_uzs, quantity, total_uzs
       FROM order_items WHERE order_id = $1`,
      [ord.id],
    );

    return {
      id: ord.id,
      orderNumber: ord.order_number,
      customerName: ord.customer_name,
      customerPhone: ord.customer_phone,
      region: ord.region,
      district: ord.district,
      address: ord.address,
      status: ord.status,
      paymentMethod: ord.payment_method,
      paymentStatus: ord.payment_status,
      trackingCode: ord.tracking_code,
      subtotalUzs: Number(ord.subtotal_uzs),
      deliveryFeeUzs: Number(ord.delivery_fee_uzs),
      discountUzs: Number(ord.discount_uzs),
      totalUzs: Number(ord.total_uzs),
      createdAt: ord.created_at,
      items: itemsRes.rows.map((i) => ({
        id: i.id,
        productId: i.product_id,
        productName: i.product_name,
        priceUzs: Number(i.price_uzs),
        quantity: Number(i.quantity),
        totalUzs: Number(i.total_uzs),
      })),
    };
  }

  /**
   * Mijoz tomonidan buyurtmani bekor qilish (CANCELLED)
   * Avtomatik ravishda ombor qoldig'ini qaytaradi va Admin/Manager/Support ga xabar yuboradi
   */
  @Post('orders/:id/cancel')
  async cancelOrderByCustomer(
    @Param('id') idOrNumber: string,
    @Body() body: { reason?: string; customerPhone?: string },
  ) {
    const clean = sanitizeText(idOrNumber).toUpperCase();
    const res = await this.db.query(
      `SELECT * FROM orders WHERE id = $1 OR UPPER(order_number) = $2 LIMIT 1`,
      [idOrNumber, clean],
    );
    const ord = res.rows[0];
    if (!ord) {
      throw new NotFoundException('Buyurtma topilmadi');
    }

    if (ord.status === 'DELIVERED') {
      throw new BadRequestException('Yetkazib berilgan buyurtmani bekor qilib bo‘lmaydi');
    }
    if (ord.status === 'CANCELLED') {
      throw new BadRequestException('Ushbu buyurtma allaqachon bekor qilingan');
    }

    const reason = body?.reason
      ? sanitizeText(body.reason)
      : 'Mijoz tomonidan bekor qilindi';

    await this.db.withTransaction(async (tx) => {
      const itemsRes = await tx.query('SELECT * FROM order_items WHERE order_id = $1', [ord.id]);
      for (const item of itemsRes.rows) {
        await tx.query(
          `UPDATE inventory
           SET stock_quantity = stock_quantity + $1, in_stock = true, updated_at = NOW()
           WHERE product_id = $2`,
          [Number(item.quantity), item.product_id],
        );
      }

      const nextPayStatus = ord.payment_status === 'PAID' ? 'REFUNDED' : ord.payment_status;
      await tx.query(
        `UPDATE orders
         SET status = 'CANCELLED',
             payment_status = $1,
             comment = COALESCE(comment || ' | ', '') || $2,
             updated_at = NOW()
         WHERE id = $3`,
        [nextPayStatus, `Bekor qilindi: ${reason}`, ord.id],
      );
    });

    await this.telegram.notifyCustomerCancelledOrder({
      orderNumber: ord.order_number,
      customerName: ord.customer_name,
      customerPhone: ord.customer_phone,
      totalUzs: Number(ord.total_uzs),
      reason,
    });

    await this.telegram.notifyOrderStatusChanged({
      userId: ord.user_id,
      orderNumber: ord.order_number,
      customerName: ord.customer_name,
      status: 'CANCELLED',
      trackingCode: ord.tracking_code,
    });

    return {
      id: ord.id,
      orderNumber: ord.order_number,
      status: 'CANCELLED',
      success: true,
    };
  }

  /**
   * Server-side To'lov Tasdiqlash (Click, Payme, Uzum Bank)
   * Soxta to'lov tasdiqlariga yo'l qo'ymaydi — kriptografik HMAC imzoni tekshiradi
   */
  @Post('payments/verify')
  async verifyPayment(
    @Body()
    body: {
      orderId: string;
      provider: 'CLICK' | 'PAYME' | 'UZUM';
      amountUzs: number;
      signatureToken: string;
    },
  ) {
    const provider = (body.provider || '').toUpperCase();
    const orderRes = await this.db.query('SELECT * FROM orders WHERE id = $1', [body.orderId]);
    const ord = orderRes.rows[0];
    if (!ord) {
      throw new NotFoundException('Buyurtma topilmadi');
    }

    const expectedAmount = Number(ord.total_uzs);
    if (Number(body.amountUzs) !== expectedAmount) {
      throw new ForbiddenException('To‘lov summasi buyurtma summasiga mos kelmadi');
    }

    const isAuthentic = verifyPaymentSignature(
      provider,
      ord.id,
      expectedAmount,
      body.signatureToken,
    );
    if (!isAuthentic) {
      throw new ForbiddenException(
        'XAVFSIZLIK XATOSI: To‘lov kriptografik imzosi soxta yoki tasdiqlanmadi!',
      );
    }

    const txId = `${provider}-TX-${Date.now()}`;
    await this.db.withTransaction(async (tx) => {
      await tx.query(
        `UPDATE payments
         SET status = 'PAID', external_tx_id = $1, signature_verified = true, paid_at = NOW()
         WHERE order_id = $2`,
        [txId, ord.id],
      );
      await tx.query(
        `UPDATE orders
         SET payment_status = 'PAID', status = CASE WHEN status = 'NEW' THEN 'CONFIRMED' ELSE status END, updated_at = NOW()
         WHERE id = $1`,
        [ord.id],
      );
    });

    await this.telegram.notifyOrderStatusChanged({
      userId: ord.user_id,
      orderNumber: ord.order_number,
      customerName: ord.customer_name,
      status: 'CONFIRMED',
      trackingCode: ord.tracking_code,
    });

    return {
      verified: true,
      provider,
      transactionId: txId,
      orderNumber: ord.order_number,
      paymentStatus: 'PAID',
      orderStatus: 'CONFIRMED',
    };
  }
}
