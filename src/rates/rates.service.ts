import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { RateDto, RateSource, RatesResponseDto } from './dto/rate.dto';
import { BcvProvider } from './providers/bcv.provider';
import { BinanceProvider } from './providers/binance.provider';

const LABELS: Record<RateSource, string> = {
  [RateSource.BCV]: 'Tasa BCV',
  [RateSource.EUR]: 'Tasa Euro',
  [RateSource.BINANCE]: 'Tasa Binance',
  [RateSource.PROMEDIO]: 'Tasa Promedio',
};

/**
 * Mantiene en memoria el último valor conocido de cada tasa y lo refresca
 * periódicamente (cron). Si una fuente falla, se conserva el valor anterior
 * marcado como `stale` para que la app nunca se quede sin datos.
 */
@Injectable()
export class RatesService implements OnModuleInit {
  private readonly logger = new Logger(RatesService.name);
  private readonly cache = new Map<RateSource, RateDto>();
  private updatedAt: string | null = null;
  private refreshing: Promise<void> | null = null;

  constructor(
    private readonly bcv: BcvProvider,
    private readonly binance: BinanceProvider,
    private readonly config: ConfigService,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    const expr = this.config.get<string>('RATES_REFRESH_CRON') ?? '*/10 * * * *';
    const job = new CronJob(expr, () => void this.refresh());
    this.scheduler.addCronJob('refresh-rates', job);
    job.start();
    this.logger.log(`Refresco de tasas programado: "${expr}"`);
    await this.refresh();
  }

  /** Devuelve todas las tasas; si aún no hay caché, fuerza una carga. */
  async getAll(): Promise<RatesResponseDto> {
    if (this.cache.size === 0) await this.refresh();
    if (this.cache.size === 0) {
      throw new ServiceUnavailableException('No fue posible obtener las tasas en este momento');
    }
    const order = [RateSource.BCV, RateSource.EUR, RateSource.BINANCE, RateSource.PROMEDIO];
    return {
      rates: order.map((s) => this.cache.get(s)).filter((r): r is RateDto => !!r),
      updatedAt: this.updatedAt ?? new Date().toISOString(),
    };
  }

  async getOne(source: RateSource): Promise<RateDto> {
    const all = await this.getAll();
    const rate = all.rates.find((r) => r.source === source);
    if (!rate) throw new ServiceUnavailableException(`Tasa "${source}" no disponible`);
    return rate;
  }

  /** Fuerza un refresco (sin ejecutar dos en paralelo). */
  refresh(): Promise<void> {
    if (!this.refreshing) {
      this.refreshing = this.doRefresh().finally(() => (this.refreshing = null));
    }
    return this.refreshing;
  }

  private async doRefresh(): Promise<void> {
    const now = new Date().toISOString();
    const [bcvRes, binRes] = await Promise.allSettled([this.bcv.fetch(), this.binance.fetch()]);

    if (bcvRes.status === 'fulfilled') {
      this.set(RateSource.BCV, 'USD', bcvRes.value.usd.value, bcvRes.value.usd.sourceDate, now);
      this.set(RateSource.EUR, 'EUR', bcvRes.value.eur.value, bcvRes.value.eur.sourceDate, now);
    } else {
      this.markStale(RateSource.BCV, RateSource.EUR);
      this.logger.warn(`BCV falló: ${String(bcvRes.reason)}`);
    }

    if (binRes.status === 'fulfilled') {
      this.set(RateSource.BINANCE, 'USD', binRes.value.value, binRes.value.sourceDate, now);
    } else {
      this.markStale(RateSource.BINANCE);
      this.logger.warn(`Binance falló: ${String(binRes.reason)}`);
    }

    // Promedio = (BCV + Binance) / 2, usando lo que haya en caché (aunque sea stale).
    const bcv = this.cache.get(RateSource.BCV);
    const bin = this.cache.get(RateSource.BINANCE);
    if (bcv && bin) {
      const avg = Number(((bcv.value + bin.value) / 2).toFixed(4));
      this.set(RateSource.PROMEDIO, 'USD', avg, now, now, bcv.stale || bin.stale);
    }

    this.updatedAt = now;
    this.logger.log(
      `Tasas: ${[...this.cache.values()].map((r) => `${r.source}=${r.value}${r.stale ? '*' : ''}`).join(' | ')}`,
    );
  }

  private set(
    source: RateSource,
    currency: 'USD' | 'EUR',
    value: number,
    sourceDate: string | null,
    fetchedAt: string,
    stale = false,
  ) {
    this.cache.set(source, { source, label: LABELS[source], currency, value, sourceDate, fetchedAt, stale });
  }

  private markStale(...sources: RateSource[]) {
    for (const s of sources) {
      const prev = this.cache.get(s);
      if (prev) this.cache.set(s, { ...prev, stale: true });
    }
  }
}
