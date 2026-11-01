import { Inject } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as crypto from 'crypto';
import { DatabaseService } from '../prisma/database.service';
import { sanitizeText } from '../common/security.util';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  @SubscribeMessage('join_session')
  async handleJoinSession(
    @MessageBody() data: { sessionKey: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data?.sessionKey) {
      client.join(data.sessionKey);
    }
    return { joined: data?.sessionKey };
  }

  @SubscribeMessage('operator_message')
  async handleOperatorMessage(
    @MessageBody()
    data: {
      conversationId: string;
      sessionKey: string;
      operatorName: string;
      content: string;
    },
  ) {
    const content = sanitizeText(data.content);
    const operatorName = sanitizeText(data.operatorName || 'TECHPULSE Operator');
    if (!content || !data.conversationId) return;

    const msgId = `msg-${crypto.randomUUID().slice(0, 8)}`;
    await this.db.query(
      `INSERT INTO messages (id, conversation_id, sender_type, sender_name, content)
       VALUES ($1, $2, 'OPERATOR', $3, $4)`,
      [msgId, data.conversationId, operatorName, content],
    );
    await this.db.query(
      `UPDATE conversations SET mode = 'OPERATOR', status = 'ACTIVE', updated_at = NOW() WHERE id = $1`,
      [data.conversationId],
    );

    const payload = {
      id: msgId,
      conversationId: data.conversationId,
      senderType: 'OPERATOR',
      senderName: operatorName,
      content,
      createdAt: new Date().toISOString(),
    };

    if (data.sessionKey && this.server) {
      this.server.to(data.sessionKey).emit('new_message', payload);
    }
    if (this.server) {
      this.server.emit('admin_chat_update', payload);
    }
    return payload;
  }
}
