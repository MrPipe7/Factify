# Backend Factify

Motor de verificación serverless. No usa `npm install`: solo TypeScript y APIs externas.

## Archivos

```
backend/
├── src/
│   ├── verification.ts   # Motor principal (Fact Check + Tavily + veredicto)
│   └── cache.ts          # Caché opcional en Supabase
└── supabase/
    └── schema.sql        # Tabla verification_cache
```

La lógica heurística compartida está en `../shared/analyzer.ts`.

## Entrada en producción

`api/verify.ts` (raíz del repo) importa `runVerification` desde aquí.

## Variables de entorno

Se leen desde `.env` en la raíz del proyecto:

- `GOOGLE_FACTCHECK_API_KEY`
- `TAVILY_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `CACHE_TTL_HOURS` (opcional, default 48)
