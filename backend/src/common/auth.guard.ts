import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyJwt, JwtPayload } from './security.util';

export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader: string | undefined = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Avtorizatsiya talab qilinadi (Token topilmadi)');
    }
    const token = authHeader.slice(7).trim();
    const payload = verifyJwt(token, 'access');
    if (!payload) {
      throw new UnauthorizedException('Token yaroqsiz yoki muddati tugagan');
    }
    req.user = payload;
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest();
    const authHeader: string | undefined = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Admin panelga kirish uchun avtorizatsiya zarur');
    }
    const payload: JwtPayload | null = verifyJwt(authHeader.slice(7).trim(), 'access');
    if (!payload) {
      throw new UnauthorizedException('Sessiya muddati tugagan, qayta kiring');
    }
    req.user = payload;

    if (payload.role === 'SUPER_ADMIN') {
      return true;
    }

    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(payload.role)) {
      throw new ForbiddenException(
        `Sizning rolingiz (${payload.role}) ushbu amalni bajarish huquqiga ega emas`,
      );
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPerms = payload.permissions || [];
      const hasAll = requiredPermissions.every((p) => userPerms.includes(p));
      if (!hasAll) {
        throw new ForbiddenException(
          `Ruxsat etilmagan amal: ${requiredPermissions.join(', ')} huquqi talab qilinadi`,
        );
      }
    }

    return true;
  }
}
