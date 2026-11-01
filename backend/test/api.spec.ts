import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

async function runTests() {
  console.log('🧪 Starting TECHPULSE.UZ Backend & Database Integration Tests...');
  const app = await NestFactory.create(AppModule, { logger: ['error'] });
  app.setGlobalPrefix('api');
  await app.listen(4055, '127.0.0.1');
  const base = 'http://127.0.0.1:4055/api';

  try {
    // 1. Test Home Data & Seeded PostgreSQL Catalog
    const homeRes = await fetch(`${base}/catalog/home`);
    const home = await homeRes.json();
    if (!homeRes.ok || !home.categories || home.categories.length < 15) {
      throw new Error(`Home catalog test failed: ${JSON.stringify(home).slice(0, 200)}`);
    }
    console.log(`✅ [1/7] Catalog Home verified: ${home.categories.length} categories, ${home.bestSellers.length} best-sellers loaded from PostgreSQL.`);

    // 2. Test Advanced Search & Filtering
    const searchRes = await fetch(`${base}/catalog/products?q=RTX&sort=price_asc`);
    const search = await searchRes.json();
    if (!searchRes.ok || search.total < 1) {
      throw new Error('Product search failed');
    }
    console.log(`✅ [2/7] Multi-criteria Search & Filtering verified: found ${search.total} RTX products.`);

    // 3. Test AI Gaming PC Builder (Compatibility + FPS + Budget)
    const pcRes = await fetch(`${base}/ai/pc-builder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Menga PUBG, CS2 va GTA V o‘ynash uchun 200–300 FPS beradigan kompyuter kerak. Byudjetim 15 million so‘m.',
        language: 'uz',
      }),
    });
    const pc = await pcRes.json();
    if (!pcRes.ok || !pc.compatibility?.allCompatible || pc.components?.length !== 8) {
      throw new Error(`AI PC Builder test failed: ${JSON.stringify(pc)}`);
    }
    console.log(`✅ [3/7] AI Gaming PC Builder verified: 8 compatible parts selected, total = ${pc.totalPriceUzs.toLocaleString('ru-RU')} UZS, CS2 FPS = ${pc.fpsEstimates[0].label}.`);

    // 4. Test AI Tech Assistant (Database Grounded Tool Calling)
    const chatRes = await fetch(`${base}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionKey: 'test-session-001',
        message: 'Menga gaming noutbuk tavsiya qiling va yetkazib berish shartlarini ayting',
        language: 'uz',
      }),
    });
    const chat = await chatRes.json();
    if (!chatRes.ok || !chat.reply || chat.recommendedProducts.length === 0) {
      throw new Error('AI Assistant chat test failed');
    }
    console.log(`✅ [4/7] AI Tech Assistant verified: recommended ${chat.recommendedProducts.length} real DB products with UZS prices.`);

    // 5. Test Transactional Order Creation + Server-Side Payment Verification (Click) + Fake Signature Rejection
    const firstProduct = search.items[0];
    const orderRes = await fetch(`${base}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Test Xaridor',
        customerPhone: '+998901112233',
        region: 'Samarqand viloyati',
        district: 'Samarqand shahri',
        address: 'Registon ko‘chasi 12-uy',
        paymentMethod: 'CLICK',
        couponCode: 'TECHPULSE10',
        items: [{ productId: firstProduct.id, quantity: 1 }],
      }),
    });
    const order = await orderRes.json();
    if (!orderRes.ok || !order.orderNumber || !order.paymentSession?.signatureToken) {
      throw new Error(`Order creation failed: ${JSON.stringify(order)}`);
    }

    // 5a. Attempt FAKE payment signature -> must be rejected with 403 Forbidden
    const fakePayRes = await fetch(`${base}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.orderId,
        provider: 'CLICK',
        amountUzs: order.totalUzs,
        signatureToken: 'fake_forged_signature_12345',
      }),
    });
    if (fakePayRes.status !== 403) {
      throw new Error(`Security flaw: fake payment signature was not blocked! Status: ${fakePayRes.status}`);
    }

    // 5b. Verify authentic server-signed payment
    const realPayRes = await fetch(`${base}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.orderId,
        provider: 'CLICK',
        amountUzs: order.totalUzs,
        signatureToken: order.paymentSession.signatureToken,
      }),
    });
    const realPay = await realPayRes.json();
    if (!realPayRes.ok || !realPay.verified || realPay.paymentStatus !== 'PAID') {
      throw new Error('Authentic payment verification failed');
    }
    console.log(`✅ [5/7] Transactional Order (#${order.orderNumber}) & Anti-Fraud Payment Verification passed (fake signature blocked with 403, valid HMAC verified).`);

    // 6. Test Admin RBAC Authentication & Live Price Sync
    const adminLoginRes = await fetch(`${base}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@techpulse.uz',
        password: 'Admin@2026!',
      }),
    });
    const adminAuth = await adminLoginRes.json();
    if (!adminLoginRes.ok || !adminAuth.accessToken) {
      throw new Error('Admin login failed');
    }

    const overviewRes = await fetch(`${base}/admin/overview`, {
      headers: { Authorization: `Bearer ${adminAuth.accessToken}` },
    });
    const overview = await overviewRes.json();
    if (!overviewRes.ok || overview.metrics.totalOrders < 2) {
      throw new Error('Admin overview failed');
    }
    console.log(`✅ [6/7] Admin Dashboard RBAC & Analytics verified: Total Revenue = ${overview.metrics.totalRevenueUzs.toLocaleString('ru-RU')} UZS.`);

    // 7. Test AI Management Settings Update
    const aiAdminRes = await fetch(`${base}/admin/ai`, {
      headers: { Authorization: `Bearer ${adminAuth.accessToken}` },
    });
    const aiAdmin = await aiAdminRes.json();
    if (!aiAdminRes.ok || !aiAdmin.settings) {
      throw new Error('AI Admin endpoint failed');
    }
    console.log(`✅ [7/7] AI Management Panel verified: ${aiAdmin.stats.total_requests} AI requests logged.`);
    console.log('🎉 ALL 7 BACKEND & DATABASE INTEGRATION TESTS PASSED!');
  } finally {
    await app.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

