import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { FlightsModule } from './flights/flights.module';
import { BookingsModule } from './bookings/bookings.module';

/**
 * AppModule — root module. Wires together all top-level modules.
 *
 * ConfigModule.forRoot():
 * - isGlobal: true → ConfigService is available everywhere without importing ConfigModule
 * - load: [configuration] → loads our typed config factory
 * - envFilePath: ['.env'] → loads .env file in development
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '../.env'],
    }),
    DatabaseModule,
    FlightsModule,
    BookingsModule,
  ],
})
export class AppModule {}
