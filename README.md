# Factify - Prototipo de verificacion de noticias (v0.2.0)

Factify analiza contenido noticioso y lo clasifica como `confiable`, `dudoso` o `falso`. Combina un **baseline de NLP basado en reglas lingüísticas y señales textuales**, complementado por consultas a verificadores o fuentes externas cuando están disponibles.

> El prototipo **no determina la verdad absoluta**. El análisis local identifica señales de riesgo; la clasificación **falsa** requiere evidencia externa suficiente. La evaluación con 30 casos sirve para medir el desempeño inicial. En futuras versiones puede incorporarse un modelo preentrenado (BERT, DistilBERT, RoBERTa).

## Tecnologias

| Capa | Stack |
|------|--------|
| **Frontend** | React 18, TypeScript, Vite 6, CSS design system |
| **Backend** | TypeScript serverless (Vercel Functions) |
| **Datos** | Supabase PostgreSQL (cache opcional) |
| **APIs externas** | Google Fact Check Tools API, Tavily Search API |
| **Logica compartida** | `shared/analyzer.ts`, `shared/validateInput.ts` |

## Estructura

```
Factifyy/
├── data/
│   ├── evaluation_news.json   # 30 casos para evaluación técnica
│   └── demo_examples.json     # Ejemplos rápidos del frontend
├── frontend/
├── backend/src/
│   ├── verification.ts
│   └── evaluation.ts
├── shared/
├── api/
│   ├── verify.ts
│   └── evaluation.ts
└── scripts/
    ├── test-prototype.mjs
    └── test-requirements.mjs
```

## Variables de entorno (.env en la raiz)

```env
FACTIFY_PROTOTYPE_VERSION=0.2.0
FACTIFY_ADMIN_KEY=
GOOGLE_FACTCHECK_API_KEY=
TAVILY_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
CACHE_TTL_HOURS=48
```

## Ejecucion local

```bash
npm run install:frontend
npm run dev
```

Abre http://localhost:5173

## Validacion de entradas (POST /api/verify)

- Minimo **20 caracteres**, maximo **10.000**
- Campo `text` obligatorio (string)
- Errores HTTP **400** / **413** con mensaje JSON `{ "error": "..." }`

## Clasificacion responsable

| Situacion | Resultado |
|-----------|-----------|
| Solo señales textuales, pocas alertas | Confiable (preliminar) |
| Señales medias o altas sin evidencia externa | Dudoso |
| Evidencia externa que refuta | Falso |
| Evidencia externa que respalda | Confiable |
