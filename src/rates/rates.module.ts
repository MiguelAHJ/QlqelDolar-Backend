import { Module } from '@nestjs/common';
import { BcvProvider } from './providers/bcv.provider';
import { BinanceProvider } from './providers/binance.provider';
import { RatesController } from './rates.controller';
import { RatesService } from './rates.service';

@Module({
  controllers: [RatesController],
  providers: [RatesService, BcvProvider, BinanceProvider],
  exports: [RatesService],
})
export class RatesModule {}
