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
FACTIFY_ADMIN_KEY=PipeAdmin
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

## Panel tecnico oculto (presentacion / informe)

No aparece en el menu publico.

1. Navega a **http://localhost:5173/admin/evaluation**
2. Clave configurada con `FACTIFY_ADMIN_KEY` (por defecto en desarrollo: `PipeAdmin`)
3. Pulsa **Ejecutar evaluacion** para procesar los 30 casos

## Evaluacion de 30 casos (API)

```bash
curl "http://localhost:5173/api/evaluation?key=PipeAdmin"
```

Devuelve exactitud, falsos positivos/negativos, matriz de confusion y detalle por caso.

## Pruebas

```bash
npm run test:prototype      # Casos funcionales del motor
npm run test:requirements   # RF01–RF09 y reglas de clasificacion
```

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

La respuesta incluye `analysisOrigin` (origen del resultado) para la interfaz.

## Build y despliegue (Vercel)

El proyecto está listo para Vercel: frontend estático (`frontend/dist`) + funciones en `api/`.

### 1. Subir el código a GitHub

```bash
git init
git add .
git commit -m "Factify prototipo v0.2.0"
git remote add origin https://github.com/TU_USUARIO/factify.git
git push -u origin main
```

### 2. Crear proyecto en Vercel

1. Entra en [vercel.com](https://vercel.com) → **Add New Project**
2. Importa el repositorio de GitHub
3. Vercel detectará `vercel.json` automáticamente:
   - **Install:** `cd frontend && npm install`
   - **Build:** `cd frontend && npm run build`
   - **Output:** `frontend/dist`

### 3. Variables de entorno (Vercel → Settings → Environment Variables)

Configura al menos estas (copia desde `.env.example`):

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `FACTIFY_ADMIN_KEY` | Sí | Clave del panel `/admin/evaluation` (ej. `PipeAdmin`) |
| `GOOGLE_FACTCHECK_API_KEY` | No | Verificación profesional (Google Fact Check) |
| `TAVILY_API_KEY` | No | Búsqueda de fuentes en vivo |
| `SUPABASE_URL` | No | Caché opcional |
| `SUPABASE_SERVICE_KEY` | No | Caché opcional |
| `CACHE_TTL_HOURS` | No | TTL caché (default 48) |

Sin las APIs externas la app sigue funcionando con análisis local.

### 4. Desplegar

Cada `git push` a `main` redeploya automáticamente. También puedes usar la CLI:

```bash
npx vercel --prod
```

### 5. URLs en producción

| Ruta | Uso |
|------|-----|
| `https://tu-proyecto.vercel.app/` | App pública |
| `https://tu-proyecto.vercel.app/admin/evaluation` | Panel técnico (clave admin) |
| `POST /api/verify` | Verificación de noticias |
| `GET /api/evaluation?key=...` | Evaluación 30 casos |

### 6. Probar producción

```bash
node scripts/test-prototype.mjs --base https://tu-proyecto.vercel.app
node scripts/test-requirements.mjs --base https://tu-proyecto.vercel.app
```

> **Nota:** La evaluación de 30 casos puede tardar ~10–20 s. En plan Hobby el límite es 10 s por función; si falla, usa plan Pro o ejecuta evaluación local con `npm run test:evaluation`.
