import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const origins = process.env.CORS_ORIGINS ?? '*';
  app.enableCors({ origin: origins === '*' ? true : origins.split(',').map((o) => o.trim()) });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Qlq el Dólar API')
    .setDescription('Tasas de cambio Bs/USD: BCV, Euro, Binance P2P y promedio')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  logger.log(`API lista en http://localhost:${port}/api  (docs: /docs)`);
}
void bootstrap();
