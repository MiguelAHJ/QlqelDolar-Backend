import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as https from 'https';
import { ProviderResult } from './rate-provider.interface';

export interface BcvRates {
  usd: ProviderResult;
  eur: ProviderResult;
}

const MESES: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

/**
 * Scraper de la página principal del BCV (https://www.bcv.org.ve).
 * El sitio publica el dólar y el euro oficiales dentro de <div id="dolar"> y <div id="euro">,
 * cada uno con un <strong> que contiene el valor con coma decimal (ej. "36,58170000").
 */
@Injectable()
export class BcvProvider {
  private readonly logger = new Logger(BcvProvider.name);
  private readonly url = 'https://www.bcv.org.ve/';

  // El certificado TLS del BCV suele dar problemas de validación: se ignora sólo para este host.
  private readonly http = axios.create({
    timeout: 15000,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'es-VE,es;q=0.9',
    },
  });

  async fetch(): Promise<BcvRates> {
    const { data: html } = await this.http.get<string>(this.url, { responseType: 'text' });
    const $ = cheerio.load(html);

    const usd = this.readRate($, 'dolar', 'USD');
    const eur = this.readRate($, 'euro', 'EUR');
    const sourceDate = this.readDate($);

    this.logger.debug(`BCV -> USD ${usd} | EUR ${eur} | fecha ${sourceDate ?? 'n/d'}`);
    return { usd: { value: usd, sourceDate }, eur: { value: eur, sourceDate } };
  }

  /** Lee el valor de #id strong; si el DOM cambia, busca el bloque por el texto de la moneda. */
  private readRate($: cheerio.CheerioAPI, id: string, code: string): number {
    let text = $(`#${id} strong`).first().text().trim();
    if (!text) {
      const block = $('div')
        .filter((_, el) => $(el).find('span').first().text().trim() === code)
        .first();
      text = block.find('strong').first().text().trim();
    }
    const value = BcvProvider.parseVeNumber(text);
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`BCV: no se pudo leer la tasa ${code} (texto: "${text}")`);
    }
    return value;
  }

  /** Convierte "36,58170000" o "1.234,56" a número. */
  static parseVeNumber(raw: string): number {
    const cleaned = raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    return Number(cleaned);
  }

  /** "Fecha Valor: Martes, 22 Octubre 2024" -> ISO. */
  private readDate($: cheerio.CheerioAPI): string | null {
    const text = $('.date-display-single').first().text().trim() || $('.dinpro.center').first().text();
    const m = /(\d{1,2})\s+([a-záéíóú]+)\s+(\d{4})/i.exec(text);
    if (!m) return null;
    const month = MESES[m[2].toLowerCase()];
    if (month === undefined) return null;
    return new Date(Date.UTC(Number(m[3]), month, Number(m[1]), 4, 0, 0)).toISOString();
  }
}
