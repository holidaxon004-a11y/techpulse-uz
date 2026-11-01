import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../prisma/database.service';

@Injectable()
export class TelegramService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  private get botToken(): string {
    return process.env.TELEGRAM_BOT_TOKEN || '';
  }

  private get adminChatId(): string {
    return process.env.TELEGRAM_ADMIN_CHAT_ID || '';
  }

  async notifyAdminNewOrder(order: {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    region: string;
    district: string;
    totalUzs: number;
    paymentMethod: string;
    itemsCount: number;
  }) {
    const title = `Yangi buyurtma: #${order.orderNumber}`;
    const text =
      `🛒 *TECHPULSE.UZ — YANGI BUYURTMA!*\n` +
      `📋 Raqam: *${order.orderNumber}*\n` +
      `👤 Mijoz: ${order.customerName} (${order.customerPhone})\n` +
      `📍 Hudud: ${order.region}, ${order.district}\n` +
      `📦 Mahsulotlar soni: ${order.itemsCount} ta\n` +
      `💳 To‘lov usuli: ${order.paymentMethod}\n` +
      `💰 Jami summa: *${Number(order.totalUzs).toLocaleString('ru-RU')} so‘m*`;

    await this.recordAndSend('ADMIN', 'NEW_ORDER', title, text);
  }

  async notifyOrderStatusChanged(order: {
    userId?: string | null;
    orderNumber: string;
    customerName: string;
    status: string;
    trackingCode?: string | null;
  }) {
    const statusLabels: Record<string, string> = {
      NEW: 'Yangi qabul qilindi',
      CONFIRMED: 'Tasdiqlandi',
      PREPARING: 'Omborda tayyorlanmoqda',
      SHIPPING: 'Kuryer orqali yetkazib berilmoqda',
      DELIVERED: 'Muvaffaqiyatli yetkazildi',
      CANCELLED: 'Bekor qilindi',
    };
    const label = statusLabels[order.status] || order.status;
    const title = `Buyurtma #${order.orderNumber} holati: ${label}`;
    const text =
      `📦 Hurmatli ${order.customerName}, sizning *#${order.orderNumber}* raqamli buyurtmangiz holati yangilandi:\n` +
      `✅ Holat: *${label}*` +
      (order.trackingCode ? `\n🚚 Kuzatuv kodi: \`${order.trackingCode}\`` : '');

    await this.recordAndSend('USER', 'ORDER_STATUS', title, text, order.userId || undefined);
  }

  async notifyCustomerCancelledOrder(order: {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    totalUzs: number;
    reason?: string;
  }) {
    const title = `Mijoz buyurtmani bekor qildi: #${order.orderNumber} (CANCELLED)`;
    const text =
      `❌ *BUYURTMA MIJOZ TOMONIDAN BEKOR QILINDI (CANCELLED)*\n` +
      `📋 Raqam: *#${order.orderNumber}*\n` +
      `👤 Mijoz: ${order.customerName} (${order.customerPhone})\n` +
      `💰 Summa: *${Number(order.totalUzs).toLocaleString('ru-RU')} so‘m*\n` +
      `📝 Sabab: ${order.reason || 'Mijoz shaxsiy kabinet orqali bekor qildi'}\n` +
      `🔄 Mahsulotlar omborga avtomatik qaytarildi.`;

    await this.recordAndSend('ADMIN', 'ORDER_CANCELLED', title, text);
  }

  async notifySupportTicket(ticket: {
    ticketNumber: string;
    customerName: string;
    customerPhone: string;
    category: string;
    priority: string;
    subject: string;
  }) {
    const title = `Yangi murojaat: #${ticket.ticketNumber} (${ticket.priority})`;
    const text =
      `🎧 *YANGI MIJOZ MUROJAATI (TICKET)*\n` +
      `🔢 Raqam: *${ticket.ticketNumber}*\n` +
      `👤 Mijoz: ${ticket.customerName} (${ticket.customerPhone})\n` +
      `📂 Toifa: ${ticket.category} | Muhimlik: ${ticket.priority}\n` +
      `📝 Mavzu: ${ticket.subject}`;

    await this.recordAndSend('ADMIN', 'SUPPORT_TICKET', title, text);
  }

  async notifyLowStock(productName: string, remainingQty: number) {
    const title = `Kam qoldiq ogohlantirishi: ${productName}`;
    const text = `⚠️ *OMBOR OGOHLANTIRISHI:* "${productName}" mahsulotidan omborda atigi *${remainingQty} dona* qoldi!`;
    await this.recordAndSend('ADMIN', 'LOW_STOCK', title, text);
  }

  private async recordAndSend(
    target: 'ADMIN' | 'USER' | 'TELEGRAM',
    type: string,
    title: string,
    message: string,
    userId?: string,
  ) {
    const id = `ntf-${crypto.randomUUID().slice(0, 8)}`;
    await this.db.query(
      `INSERT INTO notifications (id, user_id, target, type, title, message, is_read)
       VALUES ($1, $2, $3, $4, $5, $6, false)`,
      [id, userId || null, target, type, title, message],
    );

    if (this.botToken && this.adminChatId) {
      try {
        await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.adminChatId,
            text: message,
            parse_mode: 'Markdown',
          }),
        });
      } catch (err) {
        console.warn('[TelegramService] Telegram API yuborishda xatolik:', (err as Error).message);
      }
    }
  }
}
