import { Module } from '@nestjs/common';
import { DatabaseService } from './prisma/database.service';
import { TelegramService } from './telegram/telegram.service';
import { AuthController } from './auth/auth.controller';
import { CatalogController } from './catalog/catalog.controller';
import { OrdersController } from './orders/orders.controller';
import { AiController } from './ai/ai.controller';
import { AdminController } from './admin/admin.controller';
import { ChatGateway } from './chat/chat.gateway';
import { JwtAuthGuard, RolesGuard } from './common/auth.guard';

@Module({
  imports: [],
  controllers: [
    AuthController,
    CatalogController,
    OrdersController,
    AiController,
    AdminController,
  ],
  providers: [
    DatabaseService,
    TelegramService,
    ChatGateway,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class AppModule {}

