import { BcvProvider } from './bcv.provider';
import { BinanceProvider } from './binance.provider';

describe('parsers', () => {
  it('parsea números con coma decimal del BCV', () => {
    expect(BcvProvider.parseVeNumber(' 36,58170000 ')).toBeCloseTo(36.5817);
    expect(BcvProvider.parseVeNumber('1.234,56')).toBeCloseTo(1234.56);
  });
  it('calcula la mediana', () => {
    expect(BinanceProvider.median([3, 1, 2])).toBe(2);
    expect(BinanceProvider.median([1, 2, 3, 100])).toBe(2.5);
  });
});
