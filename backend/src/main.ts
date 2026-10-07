import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/exceptions/global-exception.filter';

/**
 * Application bootstrap.
 *
 * Key setup:
 * 1. GlobalExceptionFilter — catches all unhandled exceptions
 * 2. CORS — allows Angular dev server (port 4200) to call our API
 * 3. Swagger documentation — configured at /api/docs
 * 4. Global prefix handled per-controller (api/flights, api/bookings)
 *
 * Note: We do NOT use app.useGlobalPipes() here because we apply
 * ValidationPipe per-controller. This gives us more control.
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global exception filter — consistent error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // CORS: allow Angular dev server
  app.enableCors({
    origin: ['http://localhost:4200'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
  });

  // Swagger OpenAPI Documentation Configuration
  const config = new DocumentBuilder()
    .setTitle('Tixxgo Flight Booking API')
    .setDescription(
      'Flight search, fare revalidation, booking, cancellation and supplier integration APIs.',
    )
    .setVersion('1.0')
    .addTag('Flights', 'Flight search and price revalidation endpoints')
    .addTag('Bookings', 'Flight booking, status management, and cancellation endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
  logger.log(`Tixxgo API is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
