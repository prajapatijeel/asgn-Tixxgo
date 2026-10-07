import { Module } from '@nestjs/common';
import { TboAdapter } from './adapters/tbo/tbo.adapter';
import { SupplierGateway } from './supplier-gateway.service';

/**
 * SupplierModule — owns all supplier integration concerns.
 *
 * Exports SupplierGateway so FlightsModule and BookingsModule can use it.
 * TboAdapter is internal — only the gateway is exposed.
 */
@Module({
  providers: [TboAdapter, SupplierGateway],
  exports: [SupplierGateway],
})
export class SupplierModule {}
