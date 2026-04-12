import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { execSync } from 'child_process';

async function bootstrap() {
  execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
  execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
