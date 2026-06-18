# 🛡️ Factify — Verificación de noticias con IA

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?logo=vercel&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase&logoColor=white)
![Google Fact Check](https://img.shields.io/badge/Google-Fact%20Check-4285F4?logo=google&logoColor=white)
![Tavily](https://img.shields.io/badge/Tavily-Search-FF6F00?logo=react&logoColor=white)
![Wikipedia](https://img.shields.io/badge/Wikipedia-API-000000?logo=wikipedia&logoColor=white)

**Factify** es una plataforma web que analiza contenido noticioso y lo clasifica como **confiable**, **dudoso** o **falso**, combinando reglas lingüísticas con consultas a fuentes externas para emitir un veredicto basado en evidencia real.

🎓 Proyecto académico — Universidad Andrés Bello, Facultad de Ingeniería, Escuela de Ingeniería en Computación e Informática, Viña del Mar, 2026.

---

## 📑 Tabla de contenidos

- [Descripción general](#descripción-general)
- [Funcionalidades clave](#funcionalidades-clave)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Inicio rápido](#inicio-rápido)
- [Variables de entorno](#variables-de-entorno)
- [Sistema de clasificación](#sistema-de-clasificación)
- [APIs externas](#apis-externas)
- [Evaluación](#evaluación)
- [Equipo](#equipo)

---

## Descripción general

Factify permite al usuario pegar una noticia, un titular o un enlace, y obtener en segundos una clasificación respaldada por:

- **Análisis heurístico local**: detección de señales de desinformación como mayúsculas excesivas, lenguaje alarmista, clickbait, falta de fuentes, etc.
- **Verificación externa**: consulta simultánea a Google Fact Check Tools, Tavily Search y Wikipedia en español.
- **Detección de postura**: cada fuente es analizada para determinar si respalda o contradice la afirmación.
- **Veredicto ponderado**: combinación de todas las evidencias para emitir un resultado con porcentaje de confianza.

El sistema incluye además un dashboard de estadísticas con métricas de uso, alertas preventivas antes de compartir contenido sensible, y un historial local en el navegador.

---

## Funcionalidades clave

### Análisis y verificación
- Clasificación en tres niveles: **confiable**, **dudoso**, **falso**.
- Porcentaje de confianza basado en la solidez de la evidencia.
- Explicación educativa del resultado.
- Consulta simultánea a múltiples fuentes externas.
- Detección de personas fallecidas para identificar claims imposibles (ej. año futuro).

### Experiencia de usuario
- Interfaz moderna con modo oscuro y claro.
- Alertas preventivas antes de compartir contenido sensible.
- Historial persistente en el navegador.
- Ejemplos predefinidos para explorar la herramienta.
- Dashboard de estadísticas con métricas de uso.
- Soporte para texto, URLs y transcripciones de video.

### Técnicas
- Motor NLP basado en reglas.
- Modelo pre-entrenado `nlptown/bert-base-multilingual-uncased-sentiment` (Hugging Face) como señal complementaria de sentimiento.
- Coincidencia difusa de afirmaciones entre fuentes.
- Caché en Supabase para evitar consultas repetidas.
- Arquitectura serverless en Vercel.
- Componentes React con sistema de diseño propio.

---

## Stack tecnológico

| Área | Tecnología |
|------|-----------|
| **Frontend** | React 18, TypeScript, Vite 6 |
| **UI/UX** | CSS design system propio (`design.css` + `variables.css`) |
| **Backend** | TypeScript serverless (Vercel Functions) |
| **Base de datos** | Supabase PostgreSQL (caché + analíticas) |
| **APIs externas** | Google Fact Check Tools, Tavily Search, Wikipedia API |
| **Despliegue** | Vercel (Frontend + Functions) |
| **Iconos** | SVG inline (sistema propio) |

---

## Arquitectura

```
                    ┌──────────────────────────────────┐
                    │        Frontend (React)          │
                    │  HomePage → ResultPage → Alert   │
                    │  DashboardPage → HistoryPage     │
                    └──────────┬───────────────────────┘
                               │
                    ┌──────────▼───────────────────────┐
                    │      Vercel Functions (API)       │
                    │                                   │
                    │  POST /api/verify                 │
                    │  GET  /api/analytics              │
                    │  POST /api/analytics              │
                    │  GET  /api/evaluation             │
                    └──────────┬───────────────────────┘
                               │
              ┌────────────────┼─────────────────┐
              ▼                ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ Google       │  │ Tavily       │  │ Wikipedia    │
    │ Fact Check   │  │ Search       │  │ (español)    │
    └──────────────┘  └──────────────┘  └──────────────┘
                               │
                    ┌──────────▼───────────────────────┐
                    │         Supabase (PostgreSQL)     │
                    │                                   │
                    │  verification_cache (TTL 48h)     │
                    │  analytics_events                 │
                    └───────────────────────────────────┘
```

---

## Estructura del repositorio

```
Factifyy/
├── api/                            # Serverless functions (Vercel)
│   ├── verify.ts                   #   POST /api/verify
│   ├── evaluation.ts               #   GET  /api/evaluation
│   └── analytics.ts                #   POST/GET /api/analytics
│
├── backend/
│   ├── src/
│   │   ├── verification.ts         # Motor principal (1267 líneas)
│   │   ├── analytics.ts            # Registro y consulta de eventos
│   │   ├── evaluation.ts           # Evaluador de 30 casos
│   │   └── cache.ts                # Caché Supabase
│   └── supabase/
│       └── schema.sql              # Tablas verification_cache + analytics_events
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── components/         # 10 componentes React
│       │   ├── utils/              # 3 utilidades (verify, analytics, analyzer)
│       │   └── App.tsx             # Punto de entrada con routing
│       ├── components/
│       │   └── Icons.tsx           # 30 iconos SVG
│       └── styles/
│           ├── design.css          # Sistema de diseño
│           ├── variables.css       # Variables CSS
│           └── app.css             # Tailwind generado
│
├── shared/                         # Lógica compartida frontend/backend
│   ├── analyzer.ts                 # NLP heurístico
│   ├── validateInput.ts            # Validación de entrada
│   └── textEncoding.ts             # Reparación UTF-8
│
├── data/
│   ├── evaluation_news.json        # 30 casos de evaluación
│   └── demo_examples.json          # Ejemplos rápidos
│
├── scripts/
│   └── run-evaluation.mjs          # Evaluador de precisión
│
├── .env                            # Variables de entorno (no commiteado)
├── vercel.json                     # Configuración de despliegue
└── README.md
```

---

## Inicio rápido

### Requisitos
- Node.js 18+
- npm 9+

### Instalación y ejecución local

```bash
# Clonar
git clone https://github.com/MrPipe7/Factify.git
cd Factify

# Dependencias
npm install
npm run install:frontend

# Crear archivo .env con las variables necesarias
# (ver sección Variables de entorno)

# Iniciar servidor de desarrollo
npm run dev
```

Abre **http://localhost:5173**.

### Despliegue en Vercel

```bash
npm i -g vercel
vercel --prod
```

Configura las variables de entorno en Vercel Dashboard → Settings → Environment Variables.

### Base de datos (Supabase)

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. Pega y ejecuta el contenido de `backend/supabase/schema.sql`
3. Copia **Project URL** y **service_role key** desde Project Settings → API

---

## Variables de entorno

| Variable | ¿Requerida? | Descripción |
|----------|------------|-------------|
| `GOOGLE_FACTCHECK_API_KEY` | ✅ Sí | API Key de Google Fact Check Tools |
| `TAVILY_API_KEY` | ✅ Sí | API Key de Tavily Search |
| `HF_API_TOKEN` | ❌ No | Token de Hugging Face (modelo pre-entrenado `nlptown/bert-base-multilingual-uncased-sentiment`) |
| `SUPABASE_URL` | ⚠️ No* | URL del proyecto Supabase |
| `SUPABASE_SERVICE_KEY` | ⚠️ No* | Service role key de Supabase |
| `FACTIFY_ADMIN_KEY` | ❌ No | Clave para panel `/admin/evaluation` |
| `CACHE_TTL_HOURS` | ❌ No | TTL de caché en Supabase (default: 48h) |

* Requeridas solo si usas caché o analíticas.

---

## Sistema de clasificación

| Resultado | ¿Cuándo ocurre? |
|-----------|----------------|
| 🟢 **Confiable** | Evidencia externa respalda la afirmación + señales textuales bajas |
| 🟡 **Dudoso** | Sin evidencia externa concluyente + señales medias/altas |
| 🔴 **Falso** | Evidencia externa contradice la afirmación, o señales muy altas + imposibilidad factual |

### Escala de confianza
- **86–100%**: Múltiples fuentes coinciden (todas respaldan o todas contradicen)
- **70–85%**: Fuentes con alto consenso
- **50–69%**: Evidencia mixta o parcial
- **< 50%**: Análisis principalmente heurístico (pocas fuentes externas)

---

## APIs externas

| API | Propósito | Límites |
|-----|-----------|---------|
| **Google Fact Check** | Buscar verificaciones previas de fact-checkers | 100 queries/día (plan gratuito) |
| **Tavily Search** | Buscar fuentes web relevantes | 1000 queries/mes (plan gratuito) |
| **Wikipedia** (español) | Consultar conocimiento general y detectar personas fallecidas | Sin límite (API pública) |
| **Hugging Face** | Modelo pre-entrenado `nlptown/bert-base-multilingual-uncased-sentiment` para análisis de sentimiento como señal complementaria | ~30k caracteres/mes (plan gratuito) |

---

## Evaluación

El proyecto incluye un evaluador con **30 casos reales** que mide la precisión del motor:

```bash
npm run test:evaluation
```

Resultado esperado: **100%** de precisión en las 3 categorías de clasificación.

El evaluador también reporta:

- Matriz de confusión
- Tasa de falsos positivos y falsos negativos
- Tiempo promedio de respuesta
- Resultado por cada caso individual

---

## Equipo

<table>
  <tr>
    <td align="center">
      <strong>Felipe Figueroa</strong><br />
      Desarrollador Full-Stack<br />
      UNAB Viña del Mar
    </td>
  </tr>
</table>

Proyecto académico Universidad Andrés Bello.
