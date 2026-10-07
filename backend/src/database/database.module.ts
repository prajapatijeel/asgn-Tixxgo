import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * DatabaseModule — establishes the Sequelize connection to MySQL.
 *
 * Why a separate module?
 * It keeps the database concern isolated. AppModule stays clean and
 * delegates all DB setup here. Other modules import SequelizeModule.forFeature()
 * directly to register their own models.
 *
 * Autoload:
 * We set autoLoadModels: true so any model registered via
 * SequelizeModule.forFeature() is automatically known to Sequelize.
 * We do NOT use sync: true in production — migrations handle schema.
 */
@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        dialect: 'mysql',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.user'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        autoLoadModels: true,
        // synchronize: false because we use migrations for schema management
        synchronize: false,
        logging: configService.get<string>('nodeEnv') === 'development' ? console.log : false,
        define: {
          timestamps: true,
          underscored: true,
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
