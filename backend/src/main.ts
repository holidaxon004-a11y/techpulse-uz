import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Simple high-speed in-memory IP Rate Limiter (protects against brute-force / DDoS)
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Security headers + API Rate Limiting middleware
  app.use((req: any, res: any, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    const ip = req.ip || req.socket?.remoteAddress || 'local';
    const now = Date.now();
    const bucket = rateBuckets.get(ip);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(ip, { count: 1, resetAt: now + 60_000 });
    } else {
      bucket.count += 1;
      if (bucket.count > 600) {
        return res.status(429).json({
          statusCode: 429,
          message: 'So‘rovlar soni me’yordan oshdi (Rate Limit). Iltimos, 1 daqiqadan so‘ng urinib ko‘ring.',
        });
      }
    }
    next();
  });

  app.setGlobalPrefix('api');

  const port = Number(process.env.PORT || 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 TECHPULSE.UZ Backend Server running on http://localhost:${port}/api`);
}

bootstrap();

