# Dubai Cares Local Site

## Local run

1. Copy `.env.example` to `.env`.
2. Put the real wallet addresses into `.env`.
3. Run:

```bash
npm run build
npm start
```

Open `http://localhost:8765/`.

## Render free deploy

Create a Render Web Service from this repository. Use the included `render.yaml` blueprint, or configure manually:

- Runtime: Node
- Build command: `npm run build`
- Start command: `npm start`
- Plan: Free
- Health check path: `/healthz`

Set these environment variables in Render:

- `USDT_TON_ADDRESS`
- `USDT_TRC20_ADDRESS`
- `USDT_BEP20_ADDRESS`
- `TON_ADDRESS`
- `BTC_ADDRESS`

The payment page reads wallet addresses from `/api/wallets`, which is backed by those environment variables.
