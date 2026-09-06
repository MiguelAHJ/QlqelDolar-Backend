import { Controller, Get, Param, ParseEnumPipe, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RateDto, RateSource, RatesResponseDto } from './dto/rate.dto';
import { RatesService } from './rates.service';

@ApiTags('rates')
@Controller('rates')
export class RatesController {
  constructor(private readonly rates: RatesService) {}

  @Get()
  @ApiOperation({ summary: 'Todas las tasas (BCV, Euro, Binance, Promedio)' })
  @ApiOkResponse({ type: RatesResponseDto })
  getAll(): Promise<RatesResponseDto> {
    return this.rates.getAll();
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Fuerza un refresco inmediato de las fuentes' })
  @ApiOkResponse({ type: RatesResponseDto })
  async refresh(): Promise<RatesResponseDto> {
    await this.rates.refresh();
    return this.rates.getAll();
  }

  @Get(':source')
  @ApiOperation({ summary: 'Una tasa específica' })
  @ApiParam({ name: 'source', enum: RateSource })
  @ApiOkResponse({ type: RateDto })
  getOne(@Param('source', new ParseEnumPipe(RateSource)) source: RateSource): Promise<RateDto> {
    return this.rates.getOne(source);
  }
}
