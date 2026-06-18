import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET não configurado');
  if (!process.env.BACKEND_API_KEY) throw new Error('BACKEND_API_KEY não configurado');

  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  // CORS restrito apenas ao domínio do frontend (configurável via env)
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PATCH'],
  });

  // Valida e sanitiza automaticamente todo payload recebido nas rotas
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(3000, '0.0.0.0');
  console.log('Backend rodando na porta 3000');
}
bootstrap();
