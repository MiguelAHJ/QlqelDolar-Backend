import { ApiProperty } from '@nestjs/swagger';

/** Identificadores de cada tasa disponible. */
export enum RateSource {
  BCV = 'bcv',
  EUR = 'eur',
  BINANCE = 'binance',
  PROMEDIO = 'promedio',
}

export class RateDto {
  @ApiProperty({ enum: RateSource, example: RateSource.BCV })
  source!: RateSource;

  @ApiProperty({ example: 'Tasa BCV' })
  label!: string;

  @ApiProperty({ description: 'Moneda base de la tasa', example: 'USD' })
  currency!: 'USD' | 'EUR';

  @ApiProperty({ description: 'Bolívares por 1 unidad de la moneda base', example: 36.5 })
  value!: number;

  @ApiProperty({ description: 'Fecha/hora reportada por la fuente (ISO). Puede ser null.', nullable: true })
  sourceDate!: string | null;

  @ApiProperty({ description: 'Momento en que el backend obtuvo el valor (ISO)' })
  fetchedAt!: string;

  @ApiProperty({ description: 'true si la última actualización falló y se sirve el último valor conocido' })
  stale!: boolean;
}

export class RatesResponseDto {
  @ApiProperty({ type: [RateDto] })
  rates!: RateDto[];

  @ApiProperty({ description: 'Última vez que se intentó refrescar (ISO)' })
  updatedAt!: string;
}
