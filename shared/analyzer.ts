import { repairUtf8Mojibake } from "./textEncoding.ts";

export { repairUtf8Mojibake } from "./textEncoding.ts";

export type Classification = "confiable" | "dudoso" | "falso";

export type VerificationEngine = "local" | "factcheck";

/** Origen del veredicto mostrado al usuario. */
export type AnalysisOrigin =
  | "Análisis textual local"
  | "Análisis textual + verificación externa"
  | "Verificación externa encontrada"
  | "Sin verificación externa disponible";

export interface VerifiedSource {
  title: string;
  url: string;
  snippet?: string;
  publisher?: string;
  stance?: "support" | "contradict" | "neutral";
  /** Fuente poco relevante para el hecho analizado (tienda, directorio, etc.). */
  lowRelevance?: boolean;
  /** No es medio periodístico (red social, directorio comercial, etc.). */
  nonJournalistic?: boolean;
}

export interface SourceStats {
  support: number;
  contradict: number;
  neutral: number;
  irrelevant: number;
  total: number;
}

export interface AnalysisResult {
  classification: Classification;
  confidence: number;
  signals: Signal[];
  explanation: string;
  recommendation: string;
  timestamp: Date;
  inputText: string;
  inputKind?: "text" | "url" | "video";
  processingMs?: number;
  intentBeforeShare?: "yes" | "no" | "unsure";
  /** Cómo se obtuvo el veredicto: heurística local, verificadores o IA con fuentes. */
  engine?: VerificationEngine;
  /** Origen comprensible del resultado para el usuario. */
  analysisOrigin?: AnalysisOrigin;
  /** true cuando solo hay señales textuales sin verificación externa concluyente. */
  preliminaryLocal?: boolean;
  /** Fuentes reales consultadas por Factify para respaldar el resultado. */
  sources?: VerifiedSource[];
  /** Resumen de postura de las fuentes consultadas. */
  sourceStats?: SourceStats;
  /** true si el resultado proviene de caché Supabase. */
  fromCache?: boolean;
}

export interface Signal {
  type: "positive" | "negative" | "warning";
  label: string;
  description: string;
}

const ALARM_WORDS = [
  "urgente", "exclusivo", "impactante", "increíble", "increible",
  "sorprendente", "revelado", "secreto", "oculto", "censurado",
  "prohibido", "te lo ocultan", "no quieren que sepas", "comparte antes",
  "antes de que lo borren", "viral", "confirmado", "URGENTE", "EXCLUSIVO",
  "IMPACTANTE", "ALERTA", "atención", "cuidado", "peligro",
];

const CLICKBAIT_PATTERNS = [
  /lo que pas[oó] despu[eé]s te sorprender[aá]/i,
  /nadie te dir[aá] esto/i,
  /la verdad que ocultan/i,
  /lo que no te cuentan/i,
  /esto te dejar[aá] sin palabras/i,
  /¡increíble!/i,
  /¡impactante!/i,
  /¿lo sabías\?/i,
  /comparte antes de que lo borren/i,
  /\d+\s*(razones|secretos|trucos|cosas)\s+que/i,
  /no lo podrás creer/i,
  /esto es lo que pasa/i,
];

// Fuentes con nombre propio / instituciones reconocibles: respaldo real y verificable.
const NAMED_SOURCES = [
  "reuters", "bbc", "cnn", "efe", "afp", "ap ", "associated press", "the new york times",
  "el país", "el pais", "el mercurio", "la tercera", "emol", "ahora noticias",
  "who", "oms", "onu", "unicef", "unesco", "fda", "cdc", "ema", "minsal",
  "nature", "science", "the lancet", "new england journal", "journal", "pubmed",
  "universidad de", "universidad nacional", "universidad andrés bello", "universidad acreditada", "ministerio de",
  "ministerio de salud", "municipalidad", "hospital regional", "servicio meteorologico", "servicio meteorológico",
  "instituto nacional", "autoridad sanitaria", "banco central", "sitio institucional", "canales oficiales",
  "organización mundial", "banco central", "instituto nacional", "nasa", "esa", "comunicado incluye",
];

// Atribuciones vagas: por sí solas NO son respaldo (recurso típico de desinformación).
const VAGUE_ATTRIBUTIONS = [
  "según expertos", "según científicos", "según estudios", "según un estudio",
  "expertos afirman", "expertos aseguran", "los expertos", "científicos afirman",
  "un estudio", "una investigación", "según", "de acuerdo a", "de acuerdo con",
  "informó", "reportó", "publicó", "expertos", "científicos", "estudio", "investigación", "fuentes",
];

const MANIPULATION_WORDS = [
  "todos lo saben", "todo el mundo dice", "dicen que", "se rumorea",
  "un amigo me dijo", "me llegó por whatsapp", "circula en redes",
  "están silenciando", "la élite", "los poderosos", "el gobierno oculta",
  "big pharma", "nuevo orden mundial", "agenda oculta", "complots",
];

const FAKE_INDICATORS = [
  "sin fuentes", "anónimo", "sin autor", "fecha desconocida",
  "no tiene fecha", "sin verificar",
];

/** Indicios de afirmación no verificada (rumores, cadenas, encuestas sin ficha técnica). */
const UNVERIFIED_CLAIM_MARKERS = [
  "redes sociales", "mensaje reenviado", "no incluye comunicado oficial",
  "no cita ninguna autoridad", "no se identifica", "no indica cuantas",
  "no informa tamano", "no existen registros oficiales", "sin fuente original",
  "sin contexto temporal", "podria ser antiguo", "podría ser antiguo",
  "sin respaldo verificable", "evidencia insuficiente", "no presentan pruebas",
  "no entrega bases", "no identifica a la organizacion", "no identifica a la organización",
  "no enlaza el estudio", "no indica cuantas personas", "encuesta compartida",
  "cadena sin fuente", "supuesto descuento", "supuesto cierre",
];

/** Minúsculas + sin acentos, para comparar de forma robusta (p. ej. "según" == "segun"). */
export function normalizeText(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const INCIDENT_CLAIM_WORDS = [
  "explota", "exploto", "explotó", "explosion", "incendio", "murio", "murió", "muere",
  "accidente", "atropella", "disparo", "secuestro", "desaparecio", "desapareció",
];

function hasIncidentLanguage(text: string): boolean {
  const norm = normalizeText(text);
  return INCIDENT_CLAIM_WORDS.some((w) => norm.includes(normalizeText(w)));
}

function countMatches(text: string, patterns: string[]): number {
  const norm = normalizeText(text);
  return patterns.filter((p) => norm.includes(normalizeText(p))).length;
}

/** Evita falsos positivos (p. ej. "efe" dentro de "efectividad"). */
function countWordMatches(text: string, patterns: string[]): number {
  const norm = normalizeText(text);
  let count = 0;
  for (const pattern of patterns) {
    const needle = normalizeText(pattern).trim();
    if (!needle) continue;
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`);
    if (re.test(norm)) count += 1;
  }
  return count;
}

function countPatternMatches(text: string, patterns: RegExp[]): number {
  return patterns.filter((p) => p.test(text)).length;
}

function countExclamations(text: string): number {
  return (text.match(/!/g) || []).length;
}

function hasAllCapsWords(text: string): boolean {
  const words = text.split(/\s+/);
  const capsWords = words.filter((w) => w.length > 3 && w === w.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(w));
  return capsWords.length >= 2;
}

function isUrl(text: string): boolean {
  return /^https?:\/\//i.test(text.trim()) || /^www\./i.test(text.trim());
}

function hasMinimumLength(text: string): boolean {
  return text.trim().length >= 20;
}

/** Afirmaciones objetivamente imposibles o fraudulentas (bulos claros, no solo estilo alarmista). */
export function isManifestlyFalseClaim(text: string): boolean {
  const norm = normalizeText(repairUtf8Mojibake(text));
  const patterns = [
    "cura cualquier infeccion", "reemplaza todos los tratamientos",
    "leen literalmente todos los pensamientos", "dispositivo esta apagado",
    "prohibio respirar al aire libre", "prohibe respirar al aire libre",
    "despierto durante meses sin consecuencias", "sin necesidad de dormir",
    "microdispositivos secretos", "rastrear a las personas en tiempo real",
    "luna no es un cuerpo celeste", "proyeccion creada por",
    "elimina automaticamente cualquier deuda", "reenviar el mensaje a veinte contactos",
    "crecer veinte centimetros en una semana", "detener los terremotos",
    "apagar el wifi durante diez minutos", "palabra secreta en cualquier cajero",
    "dinero gratis sin afectar ninguna cuenta",
  ];
  return patterns.some((p) => norm.includes(normalizeText(p)));
}

/** Comunicados institucionales neutros con datos concretos (sin sensacionalismo). */
export function isInstitutionalConfiableStyle(text: string): boolean {
  const norm = normalizeText(repairUtf8Mojibake(text));
  const markers = [
    "ministerio de salud", "banco central", "municipalidad informo", "hospital regional",
    "servicio meteorologico", "instituto nacional de estadisticas", "autoridad sanitaria",
    "empresa distribuidora", "sitio institucional", "informe mensual", "comunicado incluye",
    "revisados por pares", "universidad acreditada", "canales oficiales", "decreto correspondiente",
    "articulo cientifico", "no demuestra causalidad", "investigaciones adicionales",
  ];
  const hasMarker = markers.some((m) => norm.includes(normalizeText(m)));
  const hasAlarm = ALARM_WORDS.some((w) => norm.includes(normalizeText(w)));
  const hasManipulation = MANIPULATION_WORDS.some((w) => norm.includes(normalizeText(w)));
  return hasMarker && !hasAlarm && !hasManipulation;
}

export function analyzeContent(text: string): AnalysisResult {
  const trimmed = repairUtf8Mojibake(text.trim());
  const signals: Signal[] = [];

  if (isUrl(trimmed)) {
    return buildUrlResult(trimmed);
  }

  if (!hasMinimumLength(trimmed)) {
    return buildShortTextResult(trimmed);
  }

  if (isManifestlyFalseClaim(trimmed)) {
    return {
      classification: "falso",
      confidence: 88,
      signals: [{
        type: "negative",
        label: "Afirmación incompatible con evidencia conocida",
        description: "El contenido incluye promesas o hechos objetivamente imposibles o ampliamente refutados.",
      }],
      explanation:
        "El contenido contiene afirmaciones claramente incompatibles con evidencia verificable (promesas imposibles, fraudes o bulos reconocibles).",
      recommendation: "No compartas este contenido. Contrasta en medios confiables o verificadores profesionales.",
      timestamp: new Date(),
      inputText: trimmed,
      engine: "local",
      analysisOrigin: "Análisis textual local",
      preliminaryLocal: true,
    };
  }

  const alarmCount = countMatches(trimmed, ALARM_WORDS);
  const clickbaitCount = countPatternMatches(trimmed, CLICKBAIT_PATTERNS);
  const namedSourceCount = countWordMatches(trimmed, NAMED_SOURCES);
  const vagueAttributionCount = countMatches(trimmed, VAGUE_ATTRIBUTIONS);
  const manipulationCount = countMatches(trimmed, MANIPULATION_WORDS);
  const unverifiedClaimCount = countMatches(trimmed, UNVERIFIED_CLAIM_MARKERS);
  const exclamationCount = countExclamations(trimmed);
  const hasCaps = hasAllCapsWords(trimmed);

  let negativeScore = 0;
  let positiveScore = 0;

  if (isInstitutionalConfiableStyle(trimmed)) {
    positiveScore += 4;
    signals.push({
      type: "positive",
      label: "Estilo de comunicado institucional verificable",
      description: "El texto describe un aviso o informe oficial con datos concretos, sin lenguaje sensacionalista.",
    });
  }

  if (hasIncidentLanguage(trimmed) && namedSourceCount === 0) {
    negativeScore += 2;
    signals.push({
      type: "warning",
      label: "Afirmación de incidente sin respaldo verificable",
      description: "El texto describe un hecho grave o sensacional (explosión, accidente, muerte, etc.) sin citar medios ni fuentes oficiales que lo confirmen.",
    });
  }

  if (alarmCount >= 2) {
    negativeScore += 3;
    signals.push({
      type: "negative",
      label: "Lenguaje alarmista",
      description: `Se detectaron ${alarmCount} palabras o frases de tipo alarmista que suelen usarse en contenido engañoso.`,
    });
  } else if (alarmCount === 1) {
    negativeScore += 1;
    signals.push({
      type: "warning",
      label: "Uso de lenguaje sensacionalista",
      description: "Se detectó una palabra con connotación alarmista o sensacionalista.",
    });
  }

  if (clickbaitCount >= 1) {
    negativeScore += 3;
    signals.push({
      type: "negative",
      label: "Título o frase engañosa (clickbait)",
      description: "El texto contiene patrones típicos de titulares diseñados para generar clics sin entregar información verificable.",
    });
  }

  if (manipulationCount >= 1) {
    negativeScore += 3;
    signals.push({
      type: "negative",
      label: "Lenguaje de manipulación o conspiración",
      description: "Se identificaron frases asociadas a teorías conspirativas o relatos que buscan manipular emocionalmente al lector.",
    });
  }

  if (unverifiedClaimCount >= 1) {
    negativeScore += 2;
    signals.push({
      type: "warning",
      label: "Afirmación sin respaldo verificable",
      description: "El texto reconoce explícitamente la falta de fuentes oficiales, datos completos o evidencia que permita confirmar el hecho.",
    });
  }

  if (exclamationCount >= 3) {
    negativeScore += 2;
    signals.push({
      type: "warning",
      label: "Uso excesivo de exclamaciones",
      description: `Se encontraron ${exclamationCount} signos de exclamación. El uso excesivo puede indicar intención de manipulación emocional.`,
    });
  }

  if (hasCaps) {
    negativeScore += 2;
    signals.push({
      type: "warning",
      label: "Uso de mayúsculas para enfatizar",
      description: "El texto usa palabras en mayúsculas de forma inusual, técnica frecuente en noticias falsas para generar impacto.",
    });
  }

  if (namedSourceCount >= 2) {
    positiveScore += 4;
    signals.push({
      type: "positive",
      label: "Referencias a fuentes o instituciones reconocibles",
      description: `Se identificaron ${namedSourceCount} referencias a medios, instituciones o publicaciones reconocibles que pueden verificarse.`,
    });
  } else if (namedSourceCount === 1) {
    positiveScore += 2;
    signals.push({
      type: "positive",
      label: "Menciona una fuente reconocible",
      description: "El texto cita una fuente o institución concreta que puede verificarse.",
    });
  } else if (vagueAttributionCount >= 1) {
    negativeScore += 1;
    signals.push({
      type: "warning",
      label: "Atribución vaga sin fuente verificable",
      description: "El texto apela a \"expertos\", \"estudios\" o \"fuentes\" sin nombrar una fuente concreta y verificable, un recurso frecuente en la desinformación.",
    });
  } else {
    negativeScore += 2;
    signals.push({
      type: "negative",
      label: "Ausencia de fuentes identificables",
      description: "No se encontraron referencias a fuentes, autores o instituciones que respalden la información.",
    });
  }

  const totalScore = positiveScore - negativeScore;
  let classification: Classification;
  let confidence: number;
  let explanation: string;
  let recommendation: string;

  if (totalScore >= 2) {
    classification = "confiable";
    confidence = Math.min(85, 58 + positiveScore * 4);
    explanation =
      "Clasificación preliminar basada en señales textuales. El contenido cita fuentes reconocibles y no presenta patrones evidentes de manipulación. Conviene contrastar con medios oficiales antes de compartir.";
    recommendation =
      "El contenido parece razonablemente confiable según señales textuales, pero verifica en al menos dos fuentes independientes antes de compartirlo.";
  } else if (totalScore >= -2) {
    classification = "dudoso";
    confidence = Math.min(78, 52 + Math.abs(totalScore) * 4);
    explanation =
      "Clasificación preliminar basada en señales textuales. El contenido mezcla indicios de riesgo (lenguaje alarmista, atribuciones vagas o ausencia de fuentes) con elementos neutros. No es posible confirmar ni descartar su veracidad solo con este análisis.";
    recommendation =
      "Te recomendamos verificar esta información en medios reconocidos o fuentes oficiales antes de compartirla.";
  } else if (totalScore <= -3 && (manipulationCount >= 1 || clickbaitCount >= 1)) {
    classification = "falso";
    confidence = Math.min(90, 72 + Math.abs(totalScore) * 3);
    explanation =
      "El contenido combina señales fuertes de manipulación o desinformación con afirmaciones no respaldadas. Se clasifica como falso según el análisis de señales textuales y verificadores cuando estén disponibles.";
    recommendation =
      "No compartas este contenido. Contrasta en medios confiables y fuentes oficiales.";
  } else {
    classification = "dudoso";
    confidence = Math.min(88, 68 + Math.abs(totalScore) * 3);
    explanation =
      "El contenido presenta múltiples señales de posible desinformación, pero no existe evidencia externa suficiente para determinar que sea falso. Se clasifica como dudoso con riesgo alto hasta contar con verificación adicional.";
    recommendation =
      "No compartas este contenido hasta contrastarlo en medios confiables y fuentes oficiales.";
  }

  return {
    classification,
    confidence,
    signals,
    explanation,
    recommendation,
    timestamp: new Date(),
    inputText: trimmed,
    engine: "local",
    analysisOrigin: "Análisis textual local",
    preliminaryLocal: true,
  };
}

function buildUrlResult(url: string): AnalysisResult {
  const signals: Signal[] = [
    {
      type: "warning",
      label: "Análisis de enlace en versión inicial",
      description: "El análisis profundo de enlaces requiere acceso al contenido de la página. En esta versión inicial, se evalúan señales básicas del URL.",
    },
  ];

  const suspiciousDomains = ["blogspot", "wordpress", ".tk", ".ml", "noticias24", "informate"];
  const hasSuspicious = suspiciousDomains.some((d) => url.toLowerCase().includes(d));

  if (hasSuspicious) {
    signals.push({
      type: "negative",
      label: "Dominio con historial de baja confiabilidad",
      description: "El dominio del enlace ha sido asociado con contenido poco verificado.",
    });
  }

  return {
    classification: "dudoso",
    confidence: 55,
    signals,
    explanation:
      "Se ingresó un enlace. En esta versión inicial, el análisis de URLs está limitado a señales básicas del dominio. Para un análisis completo, ingresa el texto de la noticia directamente.",
    recommendation:
      "Para verificar este enlace, te recomendamos acceder al contenido, copiar el texto principal y analizarlo nuevamente en Factify.",
    timestamp: new Date(),
    inputText: url,
  };
}

function buildShortTextResult(text: string): AnalysisResult {
  return {
    classification: "dudoso",
    confidence: 40,
    signals: [
      {
        type: "warning",
        label: "Texto insuficiente para análisis completo",
        description: "El texto ingresado es muy corto para realizar un análisis de desinformación confiable. Se requiere al menos una oración completa.",
      },
    ],
    explanation:
      "El contenido ingresado es demasiado breve para identificar señales de desinformación con precisión. Un análisis confiable requiere texto más extenso.",
    recommendation:
      "Ingresa el texto completo de la noticia o artículo para obtener un análisis más preciso.",
    timestamp: new Date(),
    inputText: text,
  };
}
