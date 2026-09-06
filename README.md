# Tasa VE — Backend (NestJS)

API que expone las tasas de cambio Bs/USD usadas por la app móvil.

| Fuente    | Cómo se obtiene |
|-----------|-----------------|
| `bcv`     | Scraping de https://www.bcv.org.ve (`#dolar strong`) |
| `eur`     | Scraping de https://www.bcv.org.ve (`#euro strong`) |
| `binance` | API pública P2P de Binance (USDT/VES, `tradeType: BUY`), mediana de los primeros anuncios |
| `promedio`| `(bcv + binance) / 2` |

Las tasas se guardan en memoria y se refrescan con un cron (`RATES_REFRESH_CRON`, por defecto cada 10 min).
Si una fuente falla se sirve el último valor conocido con `stale: true`.

## Uso

```bash
cp .env.example .env
npm install
npm run start:dev
```

- `GET  /api/rates`           → todas las tasas
- `GET  /api/rates/:source`   → `bcv` | `eur` | `binance` | `promedio`
- `POST /api/rates/refresh`   → refresca ahora
- `GET  /docs`                → Swagger

Ejemplo de respuesta:

```json
{
  "rates": [
    { "source": "bcv", "label": "Tasa BCV", "currency": "USD", "value": 36.58, "sourceDate": "2025-01-10T04:00:00.000Z", "fetchedAt": "...", "stale": false }
  ],
  "updatedAt": "..."
}
```

## Probar desde el teléfono

La app debe apuntar a la IP de tu PC en la red local (ej. `http://192.168.1.20:3000/api`), no a `localhost`.
Para el emulador de Android usa `http://10.0.2.2:3000/api`.

## Despliegue gratuito (Render)

El repo incluye `render.yaml`, así que basta con:

1. Crear el repo en GitHub y hacer push (ver abajo).
2. En [render.com](https://render.com) → **New → Blueprint** → elegir el repo → *Apply*.
3. Render construye con `npm ci && npm run build` y arranca `node dist/main`. Health check en `/api/health`.
4. La URL pública queda como `https://qlq-el-dolar-api.onrender.com/api` → úsala como `API_BASE_URL` en la app.

> **Plan Free:** el servicio se "duerme" tras ~15 min sin tráfico y la primera petición tarda 30–60 s en despertar
> (la app muestra el shimmer mientras). Al despertar, el `onModuleInit` vuelve a cargar las tasas antes de responder.
> Si quieres evitar la siesta, un ping gratuito cada 10 min desde [cron-job.org](https://cron-job.org) a `/api/health` lo mantiene despierto.

Alternativas equivalentes: Koyeb, Fly.io o Railway (este último ya no tiene plan gratuito permanente). **Vercel no aplica**: es serverless y no puede mantener el cron ni la caché en memoria.
