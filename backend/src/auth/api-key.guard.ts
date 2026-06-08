import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const chaveRecebida = request.headers['x-api-key'];
    const chaveEsperada = process.env.BACKEND_API_KEY;

    if (!chaveEsperada) {
      throw new UnauthorizedException('API key não configurada no servidor');
    }

    if (
      !chaveRecebida ||
      chaveRecebida.length !== chaveEsperada.length ||
      !timingSafeEqual(Buffer.from(chaveRecebida), Buffer.from(chaveEsperada))
    ) {
      throw new UnauthorizedException('Chave de API inválida ou ausente');
    }

    return true;
  }
}
