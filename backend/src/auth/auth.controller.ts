import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../prisma/database.service';
import {
  hashPassword,
  sanitizeText,
  signJwt,
  verifyJwt,
  verifyPassword,
} from '../common/security.util';
import { JwtAuthGuard } from '../common/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  @Post('register')
  async register(
    @Body()
    body: {
      fullName: string;
      phone: string;
      email?: string;
      password?: string;
      language?: string;
    },
  ) {
    const fullName = sanitizeText(body.fullName);
    const phone = sanitizeText(body.phone).replace(/\s+/g, '');
    const email = body.email ? sanitizeText(body.email).toLowerCase() : null;
    const password = body.password || 'User@2026!';
    const language = ['uz', 'ru', 'en'].includes(body.language || '') ? body.language! : 'uz';

    if (!fullName || !phone || phone.length < 9) {
      throw new BadRequestException('Ism va to‘g‘ri telefon raqam (+998...) kiritilishi shart');
    }

    const existing = await this.db.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (existing.rows.length > 0) {
      throw new BadRequestException('Ushbu telefon raqam allaqachon ro‘yxatdan o‘tgan');
    }

    const id = `usr-${crypto.randomUUID().slice(0, 8)}`;
    const pwdHash = hashPassword(password);

    await this.db.query(
      `INSERT INTO users (id, full_name, phone, email, password_hash, language, role_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'role-customer')`,
      [id, fullName, phone, email, pwdHash, language],
    );

    const payload = {
      sub: id,
      role: 'CUSTOMER',
      accountType: 'USER' as const,
      name: fullName,
      phone,
      email: email || undefined,
    };
    return {
      user: { id, fullName, phone, email, language, role: 'CUSTOMER' },
      accessToken: signJwt(payload, 'access'),
      refreshToken: signJwt(payload, 'refresh'),
    };
  }

  @Post('login')
  async login(@Body() body: { phone: string; password?: string }) {
    const phone = sanitizeText(body.phone).replace(/\s+/g, '');
    const password = body.password || '';
    if (!phone) {
      throw new BadRequestException('Telefon raqamni kiriting');
    }

    const res = await this.db.query(
      `SELECT id, full_name, phone, email, password_hash, language, is_active
       FROM users WHERE phone = $1`,
      [phone],
    );
    const user = res.rows[0];
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi yoki bloklangan');
    }

    if (!verifyPassword(password, user.password_hash)) {
      throw new UnauthorizedException('Telefon raqam yoki parol noto‘g‘ri');
    }

    const payload = {
      sub: user.id,
      role: 'CUSTOMER',
      accountType: 'USER' as const,
      name: user.full_name,
      phone: user.phone,
      email: user.email || undefined,
    };

    return {
      user: {
        id: user.id,
        fullName: user.full_name,
        phone: user.phone,
        email: user.email,
        language: user.language,
        role: 'CUSTOMER',
      },
      accessToken: signJwt(payload, 'access'),
      refreshToken: signJwt(payload, 'refresh'),
    };
  }

  @Post('admin-login')
  async adminLogin(@Body() body: { email: string; password?: string }) {
    const loginIdentifier = sanitizeText(body.email).toLowerCase().trim();
    const password = body.password || '';

    const res = await this.db.query(
      `SELECT a.id, a.full_name, a.email, a.phone, a.password_hash, a.is_active, r.name as role_name, r.id as role_id
       FROM admins a
       JOIN roles r ON r.id = a.role_id
       WHERE LOWER(a.email) = $1 OR a.phone = $1`,
      [loginIdentifier],
    );
    const admin = res.rows[0];
    if (!admin || !admin.is_active) {
      throw new UnauthorizedException('Admin hisobi topilmadi');
    }

    if (!verifyPassword(password, admin.password_hash)) {
      throw new UnauthorizedException('Email yoki parol noto‘g‘ri');
    }

    const permRes = await this.db.query<{ code: string }>(
      `SELECT p.code FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = $1`,
      [admin.role_id],
    );
    const permissions = permRes.rows.map((r) => r.code);

    const payload = {
      sub: admin.id,
      role: admin.role_name,
      accountType: 'ADMIN' as const,
      name: admin.full_name,
      email: admin.email,
      phone: admin.phone,
      permissions,
    };

    return {
      admin: {
        id: admin.id,
        fullName: admin.full_name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role_name,
        permissions,
      },
      accessToken: signJwt(payload, 'access'),
      refreshToken: signJwt(payload, 'refresh'),
    };
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    const verified = verifyJwt(body.refreshToken || '', 'refresh');
    if (!verified) {
      throw new UnauthorizedException('Refresh token yaroqsiz');
    }
    const { iat, exp, ...cleanPayload } = verified;
    return {
      accessToken: signJwt(cleanPayload, 'access'),
      refreshToken: signJwt(cleanPayload, 'refresh'),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: any) {
    const userId = req.user.sub;
    const userRes = await this.db.query(
      `SELECT id, full_name, phone, email, language, created_at FROM users WHERE id = $1`,
      [userId],
    );
    const user = userRes.rows[0];
    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    const addressesRes = await this.db.query(
      `SELECT id, title, region, district, street, is_default FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [userId],
    );

    const ordersRes = await this.db.query(
      `SELECT id, order_number, status, subtotal_uzs, delivery_fee_uzs, discount_uzs, total_uzs,
              payment_method, payment_status, region, district, address, tracking_code, created_at
       FROM orders
       WHERE user_id = $1 OR customer_phone = $2
       ORDER BY created_at DESC`,
      [userId, user.phone],
    );

    for (const ord of ordersRes.rows) {
      const items = await this.db.query(
        `SELECT id, product_id, product_name, price_uzs::bigint as price_uzs, quantity, total_uzs::bigint as total_uzs
         FROM order_items WHERE order_id = $1`,
        [ord.id],
      );
      ord.items = items.rows.map((i) => ({
        ...i,
        price_uzs: Number(i.price_uzs),
        total_uzs: Number(i.total_uzs),
      }));
      ord.subtotal_uzs = Number(ord.subtotal_uzs);
      ord.delivery_fee_uzs = Number(ord.delivery_fee_uzs);
      ord.discount_uzs = Number(ord.discount_uzs);
      ord.total_uzs = Number(ord.total_uzs);
    }

    const favRes = await this.db.query(
      `SELECT f.product_id FROM favorites f WHERE f.user_id = $1`,
      [userId],
    );

    const notifRes = await this.db.query(
      `SELECT id, type, title, message, is_read, created_at
       FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [userId],
    );

    return {
      user: {
        id: user.id,
        fullName: user.full_name,
        phone: user.phone,
        email: user.email,
        language: user.language,
        createdAt: user.created_at,
      },
      addresses: addressesRes.rows,
      orders: ordersRes.rows,
      favoriteProductIds: favRes.rows.map((r) => r.product_id),
      notifications: notifRes.rows,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('addresses')
  async addAddress(
    @Req() req: any,
    @Body() body: { title: string; region: string; district: string; street: string; isDefault?: boolean },
  ) {
    const userId = req.user.sub;
    const id = `addr-${crypto.randomUUID().slice(0, 8)}`;
    if (body.isDefault) {
      await this.db.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [userId]);
    }
    await this.db.query(
      `INSERT INTO addresses (id, user_id, title, region, district, street, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        userId,
        sanitizeText(body.title || 'Manzil'),
        sanitizeText(body.region),
        sanitizeText(body.district),
        sanitizeText(body.street),
        Boolean(body.isDefault),
      ],
    );
    return { id, success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('addresses/:id')
  async deleteAddress(@Req() req: any, @Param('id') id: string) {
    await this.db.query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [id, req.user.sub]);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('favorites/toggle')
  async toggleFavorite(@Req() req: any, @Body() body: { productId: string }) {
    const userId = req.user.sub;
    const productId = body.productId;
    const existing = await this.db.query(
      'SELECT id FROM favorites WHERE user_id = $1 AND product_id = $2',
      [userId, productId],
    );
    if (existing.rows.length > 0) {
      await this.db.query('DELETE FROM favorites WHERE id = $1', [existing.rows[0].id]);
      return { favorited: false };
    }
    const id = `fav-${crypto.randomUUID().slice(0, 8)}`;
    await this.db.query('INSERT INTO favorites (id, user_id, product_id) VALUES ($1, $2, $3)', [
      id,
      userId,
      productId,
    ]);
    return { favorited: true };
  }
}
