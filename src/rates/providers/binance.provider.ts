import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ProviderResult } from './rate-provider.interface';

interface BinanceAdv {
  adv: { price: string; surplusAmount?: string; minSingleTransAmount?: string };
  advertiser: { nickName?: string; monthFinishRate?: number };
}
interface BinanceP2PResponse {
  code: string;
  data: BinanceAdv[];
  total?: number;
}

/**
 * Tasa Binance P2P: precio (en VES) al que los comerciantes VENDEN USDT,
 * es decir, lo que paga un usuario que quiere COMPRAR USDT con bolívares.
 * Se toma una muestra de los primeros anuncios ordenados por precio y se
 * calcula la mediana para amortiguar valores atípicos.
 */
@Injectable()
export class BinanceProvider {
  private readonly logger = new Logger(BinanceProvider.name);
  private readonly url = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search';
  private readonly http = axios.create({
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      Accept: '*/*',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      Origin: 'https://p2p.binance.com',
      Referer: 'https://p2p.binance.com/',
    },
  });

  constructor(private readonly config: ConfigService) {}

  async fetch(): Promise<ProviderResult> {
    const sample = Number(this.config.get('BINANCE_ADS_SAMPLE') ?? 10);
    const body = {
      asset: 'USDT',
      fiat: 'VES',
      tradeType: 'BUY', // el usuario compra USDT -> precio de venta de los comerciantes
      page: 1,
      rows: Math.min(Math.max(sample, 1), 20),
      payTypes: [],
      countries: [],
      publisherType: null,
      proMerchantAds: false,
      shieldMerchantAds: false,
      filterType: 'all',
      periods: [],
      additionalKycVerifyFilter: 0,
      classifies: ['mass', 'profession', 'fiat_trade'],
    };

    const { data } = await this.http.post<BinanceP2PResponse>(this.url, body);
    const prices = (data?.data ?? [])
      .map((a) => Number(a.adv?.price))
      .filter((p) => Number.isFinite(p) && p > 0);

    if (prices.length === 0) {
      throw new Error(`Binance P2P: respuesta sin anuncios (code=${data?.code})`);
    }

    const value = BinanceProvider.median(prices);
    this.logger.debug(`Binance P2P -> ${value} (mediana de ${prices.length} anuncios)`);
    return { value, sourceDate: new Date().toISOString() };
  }

  static median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
}
