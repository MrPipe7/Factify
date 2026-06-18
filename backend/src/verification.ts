/**
 * Motor de verificación de Factify (lado servidor).
 *
 * Orquesta dos capas, ambas opcionales y con degradación elegante:
 *   1. Google Fact Check Tools API  -> ¿la afirmación ya fue verificada por profesionales?
 *   2. Tavily Search API            -> recupera fuentes/evidencia reales y actuales.
 *
 * Si no hay claves configuradas (o todo falla) se devuelve únicamente el
 * análisis heurístico local, de modo que la app siempre funciona.
 *
 * Las claves NUNCA llegan al navegador: este módulo corre en la función
 * serverless / en el middleware del dev server de Vite.
 */

import {
  analyzeContent,
  isInstitutionalConfiableStyle,
  isManifestlyFalseClaim,
  normalizeText,
  repairUtf8Mojibake,
  type AnalysisOrigin,
  type Classification,
  type Signal,
  type SourceStats,
  type VerificationEngine,
  type VerifiedSource,
} from "../../shared/analyzer.js";
import { readVerificationCache, writeVerificationCache } from "./cache.js";
import { FACTIFY_PROTOTYPE_VERSION } from "../../shared/version.js";
import { MIN_TEXT_LENGTH } from "../../shared/validateInput.js";

export type { SourceStats };

export interface VerificationPayload {
  classification: Classification;
  confidence: number;
  signals: Signal[];
  explanation: string;
  recommendation: string;
  engine: VerificationEngine;
  analysisOrigin: AnalysisOrigin;
  preliminaryLocal: boolean;
  prototypeVersion: string;
  sources: VerifiedSource[];
  inputText: string;
  providers: string[];
  debug: string[];
  fromCache?: boolean;
  sourceStats?: SourceStats;
}

export interface VerificationInput {
  text: string;
  kind?: "text" | "url" | "video";
  /** Omite caché (evaluación reproducible). */
  skipCache?: boolean;
  /** Evaluación controlada: solo análisis textual local, sin APIs externas. */
  skipExternal?: boolean;
}

const FACTCHECK_ENDPOINT = "https://factchecktools.googleapis.com/v1alpha1/claims:search";
const TAVILY_ENDPOINT = "https://api.tavily.com/search";

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Recorta el texto a una consulta corta y representativa (titular / primeras frases). */
function toQuery(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 240) return clean;
  return clean.slice(0, 240);
}

/** Consulta orientada a encontrar evidencia verificable sobre la afirmación. */
function buildSearchQuery(text: string): string {
  return `${toQuery(text)} verificacion noticias`;
}

const INCIDENT_VERBS = [
  "explota", "exploto", "explotó", "explosion", "exploded", "exploding",
  "incendio", "incendia", "murio", "murió", "muerte", "muere", "fallecio", "falleció",
  "accidente", "atropello", "atropella", "disparo", "disparos", "secuestro",
  "desaparecio", "desapareció", "colapso", "colapsa", "detonacion", "detonación",
];

const LOW_CREDIBILITY_HOSTS = [
  "facebook.com", "fb.com", "fb.watch", "yelp.com", "tiktok.com", "instagram.com",
  "twitter.com", "x.com", "reddit.com", "pinterest.com", "threads.net",
];

const NEWS_MEDIA_HINTS = [
  "bbc.", "reuters.", "apnews.", "cnn.", "nbcnews.", "nytimes.", "elpais.", "emol.",
  "lanacion.", "clarin.", "infobae.", "miamiherald.", "local10.", "univision.",
  "animalpolitico.", "propublica.", "snopes.", "politifact.", "foxsports.", "ole.",
  "marca.", "as.com", "sport.es", "houstonchronicle.", "onefootball.",
  "caracol.", "eltiempo.", "eleconomista.", "mundodeportivo.", "cadena3.",
  "contrareplica.", "eluniversal.", "milenio.", "larepublica.",
];

/** Patrones en dominio que suelen indicar medio informativo (heurística abierta, no lista cerrada). */
const JOURNALISTIC_HOST_PATTERNS = [
  "noticias", "diario", "herald", "chronicle", "times", "tribune", "press",
  "news.", ".news", "periodico", "gaceta", "informa", "radio", "television",
  "tv.", ".tv", "portal", "revista", "magazine", "post.", "daily", "observer",
  "guardian", "standard", "express", "mirror", "sport", "deport", "econom",
  "polit", "nacion", "mundo", "cronica", "report", "media",
];

const TRUSTED_DOMAINS = [
  "wikipedia.org", "bbc.com", "bbc.co.uk", "reuters.com", "apnews.com", "efe.com",
  "who.int", "unicef.org", "nasa.gov", "gov.ar", "gob.es", "gob.mx", "europa.eu",
  "espn.com", "espndeportes.espn.com", "fifa.com", "foxsports.com", "goal.com",
  "nature.com", "science.org",
  "univision.com", "animalpolitico.com", "elpais.com", "emol.com", "lanacion.com.ar",
];

const WIKIPEDIA_CACHE = new Map<string, number | null>();

async function queryWikipediaDeathYear(title: string): Promise<number | null> {
  const cached = WIKIPEDIA_CACHE.get(title);
  if (cached !== undefined) return cached;

  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetchWithTimeout(url, { headers: { "User-Agent": "Factify/1.0" } }, 4000);
    if (!res.ok) { WIKIPEDIA_CACHE.set(title, null); return null; }

    const data: any = await res.json();
    if (data.type === "disambiguation") { WIKIPEDIA_CACHE.set(title, null); return null; }

    const desc: string = data.description || "";
    const match = desc.match(/\((\d{4})\s*[–-]\s*(\d{4})\)/);
    if (match) {
      const deathYear = parseInt(match[2], 10);
      if (deathYear > 1500 && deathYear <= new Date().getFullYear()) {
        WIKIPEDIA_CACHE.set(title, deathYear);
        return deathYear;
      }
    }

    const extract: string = data.extract || "";
    const extractLine = extract.split("\n")[0];
    const exMatch = extractLine.match(/[–-]\s*(\d{4})\)/);
    if (exMatch) {
      const deathYear = parseInt(exMatch[1], 10);
      if (deathYear > 1500 && deathYear <= new Date().getFullYear()) {
        WIKIPEDIA_CACHE.set(title, deathYear);
        return deathYear;
      }
    }

    WIKIPEDIA_CACHE.set(title, null);
    return null;
  } catch {
    WIKIPEDIA_CACHE.set(title, null);
    return null;
  }
}

function extractPersonCandidates(text: string): string[] {
  const words = text.split(/\s+/).filter((w) => w.length >= 3);
  const candidates: string[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < words.length - 1; i++) {
    const a = normalizeText(words[i]);
    const b = normalizeText(words[i + 1]);
    if (a.length < 3 || b.length < 3) continue;
    const formatted = `${capitalize(words[i])} ${capitalize(words[i + 1])}`;
    if (!seen.has(formatted)) { seen.add(formatted); candidates.push(formatted); }
  }

  for (const w of words) {
    const nw = normalizeText(w);
    if (nw.length >= 4 && nw !== "2026" && nw !== "2025" && nw !== "2024") {
      const formatted = capitalize(w);
      if (!seen.has(formatted)) { seen.add(formatted); candidates.push(formatted); }
    }
  }

  return candidates;
}

function capitalize(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

const COMMERCIAL_PATTERNS = [
  "repair", "reparacion", "reparación", "screen replacement", "screen repair",
  "we come to you", "same-day", "water damage", "battery service", "phone repair",
  "iphone repair", "precio", "price", "$", "business hours", "closed until",
  "biscayne blvd", "come to you", "fix your", "cracked screen", "subscribers",
  "likes", "views",
];

function getHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isIncidentClaim(text: string): boolean {
  const hay = normalizeText(text);
  return INCIDENT_VERBS.some((v) => hay.includes(normalizeText(v)));
}

function isLowCredibilityHost(host: string): boolean {
  return LOW_CREDIBILITY_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

function isNewsMediaHost(host: string): boolean {
  if (host.endsWith(".gov") || host.endsWith(".gob.ar") || host.endsWith(".edu")) return true;
  if (TRUSTED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) return true;
  if (NEWS_MEDIA_HINTS.some((h) => host.includes(h))) return true;
  return JOURNALISTIC_HOST_PATTERNS.some((p) => host.includes(p));
}

/** Medio utilizable para verificar: no comercial ni red social de baja credibilidad. */
function isUsableEvidenceSource(source: VerifiedSource): boolean {
  if (isCommercialContent(source)) return false;
  if (isLowCredibilityHost(getHost(source.url))) return false;
  return true;
}

function isVerifiableNewsSource(source: VerifiedSource): boolean {
  if (!isUsableEvidenceSource(source)) return false;
  const host = getHost(source.url);
  if (isNewsMediaHost(host)) return true;
  if (host.endsWith(".org") || host.endsWith(".gov") || host.endsWith(".edu")) return true;
  return false;
}

function isCommercialContent(source: VerifiedSource): boolean {
  const hay = normalizeText(`${source.title} ${source.snippet ?? ""}`);
  return COMMERCIAL_PATTERNS.some((p) => hay.includes(normalizeText(p)));
}

async function isImpossibleDeceasedClaim(text: string): Promise<{ name: string; deathYear: number } | null> {
  const normalized = normalizeText(text);
  const CURRENT_YEAR = new Date().getFullYear();

  const years: number[] = [];
  const yearMatches = normalized.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g);
  if (yearMatches) for (const m of yearMatches) years.push(parseInt(m, 10));
  const hasFutureTense = /\b\w+r[á]n(?!\w)|\b\w+r[á](?!\w)/.test(text);

  const hasTimeMarker = years.some((y) => y >= CURRENT_YEAR - 1 && y <= CURRENT_YEAR + 10) || hasFutureTense;
  if (!hasTimeMarker) return null;

  const candidates = extractPersonCandidates(text);
  for (const name of candidates) {
    const deathYear = await queryWikipediaDeathYear(name);
    if (deathYear === null) continue;

    if (years.some((y) => y > deathYear && y <= CURRENT_YEAR + 10)) {
      return { name, deathYear };
    }
    if (hasFutureTense) {
      return { name, deathYear };
    }
  }

  return null;
}

/** Verbos/relleno que no definen el hecho (p. ej. "hace", "dice"). */
const ANCHOR_FILLER_WORDS = new Set([
  "hace", "hizo", "dice", "dijo", "segun", "puede", "debe", "tiene", "tenia",
  "noticia", "texto", "contenido", "afirma", "asegura", "segun", "sobre",
]);

/** Palabras demasiado genéricas para definir un hecho concreto. */
const GENERIC_FACTCHECK_WORDS = new Set([
  "argentina", "qatar", "2022", "2023", "2024", "2025", "2026",
  "covid", "coronavirus", "vacuna", "vacunas", "grafeno", "oxido",
  "mundial", "copa", "fifa", "world", "mundo", "final", "noticias",
  "gobierno", "pais", "estado", "ciudad", "personas", "persona",
]);

/** Palabras que definen el hecho afirmado (verbos de evento + sustantivos clave). */
function claimAnchorWords(userText: string): Set<string> {
  const words = significantWords(userText);
  const anchors = new Set<string>();
  for (const w of words) {
    if (ANCHOR_FILLER_WORDS.has(w) || GENERIC_FACTCHECK_WORDS.has(w)) continue;
    if (INCIDENT_VERBS.some((v) => wordsAlign(w, normalizeText(v)))) {
      anchors.add(w);
      continue;
    }
    if (w.length >= 4 || /\d/.test(w)) anchors.add(w);
  }
  return anchors.size > 0 ? anchors : new Set([...words].filter((w) => !ANCHOR_FILLER_WORDS.has(w)));
}

function sourceMatchesClaimEvent(userText: string, sourceText: string): boolean {
  const hay = normalizeText(sourceText);
  if (!isIncidentClaim(userText)) return true;

  const userIncident = INCIDENT_VERBS.filter((v) => normalizeText(userText).includes(normalizeText(v)));
  if (userIncident.length === 0) return true;

  return userIncident.some((v) => hay.includes(normalizeText(v)));
}

function claimRelevanceStrict(userText: string, source: VerifiedSource): number {
  const userWords = significantWords(userText);
  if (userWords.size === 0) return 0;

  const hay = prepareClaimText(`${source.title} ${source.snippet ?? ""}`);
  const sourceWords = significantWords(hay);
  const anchors = claimAnchorWords(userText);

  const generalOverlap = wordOverlapCount(userWords, sourceWords);
  const anchorOverlap = wordOverlapCount(anchors, sourceWords);
  const anchorCoverage = anchorOverlap / Math.max(1, anchors.size);
  const generalCoverage = generalOverlap / Math.max(2, Math.ceil(userWords.size * 0.5));

  let score = anchorCoverage * 0.7 + generalCoverage * 0.3;

  if (isIncidentClaim(userText) && !sourceMatchesClaimEvent(userText, hay)) {
    score *= 0.15;
  }

  if (isCommercialContent(source)) {
    score *= 0.1;
  }

  if (isLowCredibilityHost(getHost(source.url)) && !DEBUNK_TERMS.some((t) => hay.includes(normalizeText(t)))) {
    score *= 0.2;
  }

  return Math.min(1, score);
}

function ratingToClassification(rating: string): Classification | null {
  const r = normalizeText(rating);
  const falseHints = ["false", "falso", "fake", "incorrect", "enga", "misleading", "manipul", "sin sustento", "no es cierto", "pants on fire"];
  const trueHints = ["true", "verdadero", "cierto", "correct", "accurate", "confirmed", "confirmado"];
  const mixedHints = ["mixt", "mixed", "parcial", "partly", "half", "exager", "engañoso en parte", "contexto"];
  if (mixedHints.some((h) => r.includes(h))) return "dudoso";
  if (falseHints.some((h) => r.includes(h))) return "falso";
  if (trueHints.some((h) => r.includes(h))) return "confiable";
  return null;
}

const STOPWORDS = new Set([
  "para", "como", "este", "esta", "estos", "estas", "sobre", "desde", "hasta", "donde",
  "cuando", "quien", "quienes", "cual", "cuales", "mundo", "final", "noticia", "segun",
  "dice", "dijo", "texto", "contenido", "año", "ano",
]);

/** Palabras significativas del texto (sin acentos, sin stopwords, >= 4 caracteres). */
function significantWords(text: string): Set<string> {
  return new Set(
    prepareClaimText(text)
      .split(/[^a-z0-9]+/)
      .filter((w) => (w.length >= 4 || /\d/.test(w)) && !STOPWORDS.has(w)),
  );
}

/**
 * Qué tan relacionada está la afirmación verificada con lo que escribió el usuario.
 * Evita usar verificaciones de OTRO bulo que solo comparte palabras sueltas (p. ej. "Argentina" + "Qatar").
 */
function claimRelevance(userText: string, claimText: string): number {
  const userWords = significantWords(userText);
  const claimWords = significantWords(claimText);
  if (userWords.size === 0 || claimWords.size === 0) return 0;

  let shared = 0;
  for (const w of userWords) {
    if (claimWords.has(w)) shared += 1;
  }

  const coverage = shared / userWords.size;
  const jaccard = shared / new Set([...userWords, ...claimWords]).size;
  return coverage * 0.65 + jaccard * 0.35;
}

const MIN_CLAIM_RELEVANCE = 0.50;

function discriminatingWords(words: Set<string>): string[] {
  return [...words].filter((w) => !GENERIC_FACTCHECK_WORDS.has(w));
}

/** La afirmación verificada debe compartir las ideas clave del usuario, no solo el tema general. */
function claimMatchesUserIntent(userText: string, claimText: string): boolean {
  const userWords = significantWords(userText);
  const claimWords = significantWords(claimText);
  const relevance = claimRelevance(userText, claimText);
  if (relevance < MIN_CLAIM_RELEVANCE) return false;

  const keyUserWords = discriminatingWords(userWords);
  if (keyUserWords.length === 0) return true;

  const matchedKey = keyUserWords.filter((w) => claimWords.has(w)).length;
  const requiredKey = keyUserWords.length === 1 ? 1 : Math.ceil(keyUserWords.length * 0.5);
  return matchedKey >= requiredKey;
}

interface FactCheckMatch {
  classification: Classification | null;
  relevance: number;
  source: VerifiedSource;
}

async function queryFactCheck(text: string, debug: string[]): Promise<FactCheckMatch | null> {
  const key = env("GOOGLE_FACTCHECK_API_KEY");
  if (!key) {
    debug.push("factcheck: sin GOOGLE_FACTCHECK_API_KEY");
    return null;
  }

  const url =
    `${FACTCHECK_ENDPOINT}?query=${encodeURIComponent(toQuery(text))}` +
    `&languageCode=es&pageSize=5&key=${key}`;

  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      const body = await res.text();
      debug.push(`factcheck: HTTP ${res.status} ${body.slice(0, 160)}`);
      return null;
    }
    const data: any = await res.json();
    const claims: any[] = Array.isArray(data?.claims) ? data.claims : [];
    if (!claims.length) {
      debug.push("factcheck: sin coincidencias para la consulta");
      return null;
    }

    let best: { match: FactCheckMatch; relevance: number } | null = null;

    for (const claim of claims) {
      const review = claim?.claimReview?.[0];
      if (!review?.url) continue;

      const claimText = `${claim.text ?? ""} ${review.title ?? ""}`;
      const relevance = claimRelevance(text, claimText);
      if (!claimMatchesUserIntent(text, claimText)) continue;

      const rating: string = review.textualRating || "";
      const classification = ratingToClassification(rating);
      if (!classification) continue;

      const match: FactCheckMatch = {
        classification,
        relevance,
        source: {
          title: review.title || claim.text || "Verificación encontrada",
          url: review.url,
          snippet: rating ? `Calificación: ${rating}` : claim.text,
          publisher: review.publisher?.name,
          stance: classification === "falso" ? "contradict" : classification === "confiable" ? "support" : "neutral",
        },
      };

      if (!best || relevance > best.relevance) {
        best = { match, relevance };
      }
    }

    if (!best) {
      debug.push("factcheck: coincidencias encontradas pero ninguna aplica al contenido analizado");
      return null;
    }

    return best.match;
  } catch (e: any) {
    debug.push(`factcheck: excepción ${e?.message ?? "desconocida"}`);
    return null;
  }
}

async function queryTavily(text: string): Promise<VerifiedSource[]> {
  const key = env("TAVILY_API_KEY");
  if (!key) return [];

  try {
    const res = await fetchWithTimeout(TAVILY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query: buildSearchQuery(text),
        search_depth: "basic",
        max_results: 5,
        include_answer: false,
      }),
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    const results: any[] = Array.isArray(data?.results) ? data.results : [];
    return results.map((r) => ({
      title: r.title || r.url,
      url: r.url,
      snippet: typeof r.content === "string" ? r.content.slice(0, 280) : undefined,
      stance: "neutral" as const,
    }));
  } catch {
    return [];
  }
}

const DEBUNK_TERMS = [
  "es falso", "son falsas", "son falsos", "resulta falso", "falso que",
  "bulo", "desmiente", "desmentid", "no es cierto", "no es verdad", "no es real",
  "engañoso", "desinformaci", "es un mito", "fake news", "hoax",
  "no hay evidencia", "sin evidencia", "sin sustento",
  "no propaga", "no propagan", "no contiene", "no causa", "no existen", "no existe", "no demuestra", "sin pruebas",
  "does not cause", "does not spread", "do not cause", "do not spread",
  "teoría conspirativa", "teoria conspirativa", "teorias conspirativas", "conspirativas",
  "pseudociencia", "calificacion: falso", "rating: false",
];

const CORROBORATE_TERMS = [
  "confirma", "confirmado", "verdadero", "cierto", "efectivamente",
  "vencio", "venció", "gano", "ganó", "campeon", "campeón", "campeona",
  "resultado", "resultado final", "resultado oficial", "oficialmente", "historial",
  "segun datos", "según datos", "triunfo", "consagro", "consagró", "victoria",
  "won", "wins", "beats", "beat", "defeated", "victory", "final score",
  "highlights", "penalties", "penales",
  "hattrick", "triplete", "goleada", "goleo", "anoto", "anotó", "marcó", "marco",
  "hat trick", "hat-trick",
];

/** Normaliza variantes comunes en afirmaciones cortas (vs, guiones, etc.). */
function prepareClaimText(text: string): string {
  return normalizeText(text)
    .replace(/\bhat[\s-]?trick\b/g, "hattrick")
    .replace(/\bvs\.?\b/g, "versus");
}

/** Dato verificable en titular o snippet: cifras, fechas, verbos de hecho, etc. */
function hasFactualMarker(text: string): boolean {
  const hay = prepareClaimText(text);
  if (/\d+\s*[-–]\s*\d+/.test(hay)) return true;
  if (/\b(20\d{2}|19\d{2})\b/.test(hay)) return true;
  if (/\d+\s*(%|por ciento|mil|millones|goles|muertos|heridos|personas|casos)\b/.test(hay)) return true;
  if (hay.includes("hattrick") || hay.includes("triplete")) return true;
  if (CORROBORATE_TERMS.some((t) => hay.includes(normalizeText(t)))) return true;
  if (INCIDENT_VERBS.some((v) => hay.includes(normalizeText(v)))) return true;
  return false;
}

const WORD_ALIASES: Record<string, string[]> = {
  coronavirus: ["covid", "covid19", "sars"],
  covid: ["coronavirus", "covid19"],
  propaga: ["propagan", "propago", "propagacion"],
  propagan: ["propaga", "propagacion"],
  gana: ["gano", "ganó", "vencio", "venció", "triunfo", "won", "wins", "beats", "beat"],
  empata: ["empate", "empato", "empataron", "tied", "draw"],
  empate: ["empata", "empato", "tied", "draw"],
  francia: ["frances", "francesa", "france"],
  france: ["francia"],
  argentina: ["argentino", "argentinos"],
  congo: ["rdcongo", "rd", "republica", "democratica"],
  argelia: ["algeria"],
  algeria: ["argelia"],
  messi: ["lionel"],
  lionel: ["messi"],
  hattrick: ["triplete"],
  triplete: ["hattrick"],
};

function wordsAlign(a: string, b: string): boolean {
  if (a === b) return true;
  const aliasesA = WORD_ALIASES[a] ?? [];
  const aliasesB = WORD_ALIASES[b] ?? [];
  if (aliasesA.includes(b) || aliasesB.includes(a)) return true;
  const minLen = Math.min(a.length, b.length);
  if (minLen >= 5 && a.slice(0, 5) === b.slice(0, 5)) return true;
  return false;
}

function wordOverlapCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const w of a) {
    if ([...b].some((bw) => wordsAlign(w, bw))) n += 1;
  }
  return n;
}

function sourceQualityWeight(source: VerifiedSource): number {
  const host = getHost(source.url);
  if (isCommercialContent(source)) return 0.15;
  if (isLowCredibilityHost(host)) return 0.25;

  let weight = 1;
  if (source.publisher) weight += 0.5;
  if (isNewsMediaHost(host)) weight += 1.5;
  if (source.snippet?.includes("Calificación:") || source.snippet?.includes("Rating:")) {
    weight += 2.5;
  }
  return weight;
}

const MIN_SOURCE_RELEVANCE = 0.62;
/** Umbral más bajo para detectar que un titular describe el mismo hecho. */
const MIN_CORROBORATION_RELEVANCE = 0.52;

function sourceSharesClaimAnchors(userText: string, hay: string, relevance = 0): boolean {
  const anchors = claimAnchorWords(userText);
  const sourceWords = significantWords(hay);
  const overlap = wordOverlapCount(anchors, sourceWords);
  const ratio = overlap / Math.max(1, anchors.size);

  if (ratio >= 0.6) return true;
  if (relevance >= 0.72 && ratio >= 0.45) return true;
  if (relevance >= 0.82 && overlap >= 2) return true;

  const required =
    anchors.size <= 2 ? Math.max(1, anchors.size) : Math.ceil(anchors.size * 0.5);
  return overlap >= required;
}

/**
 * El titular o snippet describe el mismo hecho que afirma el usuario.
 * Regla general: similitud semántica + ideas clave compartidas (cualquier tema).
 * @param commonClaimWords Palabras del usuario que aparecen en muchas fuentes (entidad, no evento).
 */
function sourceReportsSameClaim(userText: string, source: VerifiedSource, commonClaimWords?: Set<string>): boolean {
  const hay = prepareClaimText(`${source.title} ${source.snippet ?? ""}`);
  const relevance = claimRelevanceStrict(userText, source);
  if (relevance < MIN_CORROBORATION_RELEVANCE) return false;
  if (!sourceSharesClaimAnchors(userText, hay, relevance)) return false;

  if (isIncidentClaim(userText) && !sourceMatchesClaimEvent(userText, hay)) return false;

  const userWords = significantWords(userText);
  const sourceWords = significantWords(hay);
  const uniqueUserWords = [...userWords].filter((w) => w.length >= 6);
  const allUniqueAreCommon = uniqueUserWords.length > 0 && commonClaimWords && uniqueUserWords.every((w) => commonClaimWords.has(w));
  const hasUniqueMatch = uniqueUserWords.length === 0 || allUniqueAreCommon || uniqueUserWords.some((w) => sourceWords.has(w) && (!commonClaimWords || !commonClaimWords.has(w)));
  if (!hasUniqueMatch) return false;

  if (relevance >= MIN_SOURCE_RELEVANCE) return true;
  return relevance >= MIN_CORROBORATION_RELEVANCE && hasFactualMarker(hay);
}

/** La fuente refuta específicamente esta afirmación (no solo contiene "falso" en otro contexto). */
function sourceRefutesClaim(userText: string, source: VerifiedSource): boolean {
  const hay = prepareClaimText(`${source.title} ${source.snippet ?? ""}`);
  const relevance = claimRelevanceStrict(userText, source);
  if (relevance < 0.42) return false;

  const ratingSnippet = source.snippet ?? "";
  if (ratingSnippet.includes("Calificación:") || ratingSnippet.includes("Rating:")) {
    const rating = normalizeText(ratingSnippet);
    if (rating.includes("falso") || rating.includes("false") || rating.includes("fake")) return true;
    if (rating.includes("verdadero") || rating.includes("true")) return false;
  }

  if (!DEBUNK_TERMS.some((t) => hay.includes(normalizeText(t)))) return false;

  return (
    sourceSharesClaimAnchors(userText, hay, relevance) ||
    relevance >= 0.45 ||
    (isIncidentClaim(userText) && sourceMatchesClaimEvent(userText, hay))
  );
}

function sourceCorroboratesClaim(userText: string, source: VerifiedSource, commonClaimWords?: Set<string>): boolean {
  const hay = prepareClaimText(`${source.title} ${source.snippet ?? ""}`);
  if (DEBUNK_TERMS.some((t) => hay.includes(normalizeText(t)))) return false;
  return sourceReportsSameClaim(userText, source, commonClaimWords);
}

function supportsClaimExplicitly(userText: string, source: VerifiedSource, commonClaimWords?: Set<string>): boolean {
  if (!isUsableEvidenceSource(source)) return false;

  const ratingSnippet = source.snippet ?? "";
  if (ratingSnippet.includes("Calificación:") || ratingSnippet.includes("Rating:")) {
    const rating = normalizeText(ratingSnippet);
    if (rating.includes("falso") || rating.includes("false")) return false;
    return true;
  }

  if (sourceRefutesClaim(userText, source)) return false;
  if (!sourceCorroboratesClaim(userText, source, commonClaimWords)) return false;

  const relevance = claimRelevanceStrict(userText, source);
  if (isVerifiableNewsSource(source)) return true;
  return relevance >= 0.58;
}

function detectSourceStance(userText: string, source: VerifiedSource, commonClaimWords?: Set<string>): VerifiedSource["stance"] {
  if (source.stance === "support" || source.stance === "contradict") return source.stance;

  const relevance = claimRelevanceStrict(userText, source);
  if (relevance < 0.35) return "neutral";

  if (sourceRefutesClaim(userText, source)) return "contradict";
  if (supportsClaimExplicitly(userText, source, commonClaimWords)) return "support";

  return "neutral";
}

interface EvidenceScore {
  supporting: ScoredEvidence[];
  contradicting: ScoredEvidence[];
  neutral: ScoredEvidence[];
  supportWeight: number;
  contradictWeight: number;
  activeWeight: number;
}

interface ScoredEvidence {
  source: VerifiedSource;
  relevance: number;
  weight: number;
  effectiveWeight: number;
}

function analyzeEvidenceSources(sources: VerifiedSource[], userText: string): EvidenceScore {
  const supporting: ScoredEvidence[] = [];
  const contradicting: ScoredEvidence[] = [];
  const neutral: ScoredEvidence[] = [];

  const userWords = significantWords(userText);
  const wordSourceCount = new Map<string, number>();
  for (const source of sources) {
    const hay = prepareClaimText(`${source.title} ${source.snippet ?? ""}`);
    const srcWords = significantWords(hay);
    for (const w of srcWords) {
      if (userWords.has(w)) {
        wordSourceCount.set(w, (wordSourceCount.get(w) ?? 0) + 1);
      }
    }
  }
  const commonClaimWords = new Set([...wordSourceCount.entries()].filter(([_, count]) => count >= 3).map(([w]) => w));

  for (const source of sources) {
    const relevance = claimRelevanceStrict(userText, source);
    source.stance = detectSourceStance(userText, source, commonClaimWords);
    const weight = sourceQualityWeight(source);
    const effectiveWeight = weight * relevance;

    const entry: ScoredEvidence = { source, relevance, weight, effectiveWeight };

    if (source.stance === "contradict" && relevance >= 0.35) {
      contradicting.push(entry);
    } else if (
      source.stance === "support" &&
      relevance >= MIN_CORROBORATION_RELEVANCE
    ) {
      supporting.push(entry);
    } else {
      neutral.push(entry);
    }
  }

  const supportWeight = supporting.reduce((s, e) => s + e.effectiveWeight, 0);
  const contradictWeight = contradicting.reduce((s, e) => s + e.effectiveWeight, 0);

  return {
    supporting,
    contradicting,
    neutral,
    supportWeight,
    contradictWeight,
    activeWeight: supportWeight + contradictWeight,
  };
}

interface SourceVerdict {
  classification: Classification;
  confidence: number;
  explanation: string;
  recommendation: string;
  engine: VerificationEngine;
}

/** Veredicto calculado a partir del consenso de fuentes consultadas (cualquier tema). */
function computeVerdictFromSources(
  evidence: EvidenceScore,
  factCheck: FactCheckMatch | null,
  userText: string,
  totalSources: number,
): SourceVerdict | null {
  const { supportWeight, contradictWeight, supporting, contradicting, neutral } = evidence;
  const activeWeight = supportWeight + contradictWeight;

  const newsSupport = supporting.filter((e) => isVerifiableNewsSource(e.source));
  const newsContradict = contradicting.filter((e) => isVerifiableNewsSource(e.source));
  const usableSupport = supporting.filter((e) => isUsableEvidenceSource(e.source));
  const usableContradict = contradicting.filter((e) => isUsableEvidenceSource(e.source));
  const commercialNeutral = neutral.filter((e) => isCommercialContent(e.source));
  const relevantNeutral = neutral.filter((e) => e.relevance >= MIN_CORROBORATION_RELEVANCE);

  const supportN = supporting.length;
  const contradictN = contradicting.length;

  if (activeWeight < 0.5 && totalSources > 0) {
    if (commercialNeutral.length >= 2 && isIncidentClaim(userText)) {
      return {
        classification: "dudoso",
        confidence: 58,
        explanation:
          "Las fuentes encontradas no son noticias verificables sobre el hecho (tiendas, redes sociales o directorios). No hay evidencia periodística que confirme ni desmienta esta afirmación.",
        recommendation:
          "Busca esta noticia en medios reconocidos o fuentes oficiales antes de compartirla. Lo consultado no respalda el contenido.",
        engine: "factcheck",
      };
    }

    return {
      classification: "dudoso",
      confidence: Math.min(68, 55 + Math.min(12, relevantNeutral.length * 2)),
      explanation:
        relevantNeutral.length > 0
          ? `Se consultaron ${totalSources} fuente${totalSources === 1 ? "" : "s"} relacionadas con el tema, pero ninguna permitió confirmar ni refutar la afirmación con claridad.`
          : `Se consultaron ${totalSources} fuente${totalSources === 1 ? "" : "s"}, pero no aportaron evidencia concluyente sobre este hecho específico.`,
      recommendation:
        "Contrasta esta información en medios reconocidos o fuentes oficiales antes de compartirla.",
      engine: "factcheck",
    };
  }

  if (activeWeight < 0.5) return null;

  const supportRatio = supportWeight / activeWeight;
  const contradictRatio = contradictWeight / activeWeight;
  const consensus = Math.abs(supportWeight - contradictWeight) / activeWeight;

  let classification: Classification;

  if (factCheck?.classification === "falso" && !factCheck.source.lowRelevance) {
    classification = "falso";
  } else if (newsContradict.length >= 1 && newsContradict[0].relevance >= 0.55 && contradictWeight >= supportWeight * 0.85) {
    classification = "falso";
  } else if (usableContradict.length >= 2 && usableContradict[0].relevance >= 0.52 && usableContradict[1].relevance >= 0.52 && contradictRatio >= 0.55) {
    classification = "falso";
  } else if (contradictRatio >= 0.65 && usableContradict.length >= 1 && usableContradict[0].relevance >= 0.55) {
    classification = "falso";
  } else if (factCheck?.classification === "confiable" && newsSupport.length >= 1) {
    classification = "confiable";
  } else if (newsSupport.length >= 2 && newsSupport[0].relevance >= 0.55 && newsSupport[1].relevance >= 0.55 && contradictN === 0) {
    classification = "confiable";
  } else if (newsSupport.length >= 1 && newsSupport[0].relevance >= 0.58 && usableSupport.length >= 2 && contradictN === 0) {
    classification = "confiable";
  } else if (
    newsSupport.length === 1 &&
    supportN === 1 &&
    contradictN === 0 &&
    newsSupport[0].relevance >= 0.72
  ) {
    classification = "confiable";
  } else if (
    supportRatio >= 0.65 &&
    usableSupport.length >= 2 &&
    usableSupport[0].relevance >= 0.55 &&
    usableSupport[1].relevance >= 0.55 &&
    newsSupport.length >= 1 &&
    contradictRatio < 0.2
  ) {
    classification = "confiable";
  } else if (contradictWeight > supportWeight * 1.5 && usableContradict.length >= 1 && usableContradict[0].relevance >= 0.5) {
    classification = "falso";
  } else {
    classification = "dudoso";
  }

  const activeCount = supportN + contradictN;
  const newsBoost = Math.min(8, (newsSupport.length + newsContradict.length) * 2);
  const volumeBoost = Math.min(10, activeCount * 2);
  let confidence = Math.round(
    Math.min(94, Math.max(52, 48 + consensus * 36 + volumeBoost + newsBoost)),
  );

  if (classification === "dudoso") confidence = Math.min(confidence, 72);
  if (classification === "confiable" && newsSupport.length < 2 && !factCheck) {
    confidence = Math.min(confidence, 82);
  }
  if (classification === "falso" && (factCheck?.classification === "falso" || newsContradict.length >= 1)) {
    confidence = Math.max(confidence, 75);
  }

  let explanation: string;
  let recommendation: string;

  if (classification === "confiable") {
    explanation =
      factCheck?.classification === "confiable"
        ? `Medios y verificadores respaldan esta afirmación: ${newsSupport.length} fuente${newsSupport.length === 1 ? "" : "s"} periodística${newsSupport.length === 1 ? "" : "s"} y una verificación profesional equivalente la confirman.`
        : `Medios verificables respaldan esta afirmación: ${newsSupport.length} fuente${newsSupport.length === 1 ? "" : "s"} periodística${newsSupport.length === 1 ? "" : "s"} describen el mismo hecho con información coherente.`;
    recommendation =
      "El contenido está respaldado por fuentes periodísticas. Revisa las referencias listadas antes de compartir.";
  } else if (classification === "falso") {
    explanation =
      factCheck?.classification === "falso"
        ? `Fuentes periodísticas y verificadores refutan esta afirmación: ${contradictN} fuente${contradictN === 1 ? "" : "s"} la desmienten, incluida una verificación profesional equivalente.`
        : `Fuentes verificables refutan esta afirmación: ${newsContradict.length > 0 ? newsContradict.length : contradictN} fuente${contradictN === 1 ? "" : "s"} periodística${contradictN === 1 ? "" : "s"} la califican como falsa o engañosa.`;
    recommendation =
      "Las fuentes verificadas contradicen este contenido. Te recomendamos no compartirlo.";
  } else if (commercialNeutral.length >= 2) {
    explanation =
      `No se encontraron noticias que confirmen este hecho. Las búsquedas devolvieron sobre todo páginas comerciales o redes sociales (${commercialNeutral.length}), que no sirven para verificar la noticia.`;
    recommendation =
      "Contrasta esta información en medios reconocidos o portales oficiales antes de compartirla.";
  } else {
    explanation =
      `Las fuentes no son concluyentes: ${supportN} respaldan, ${contradictN} desmienten y ${neutral.length} no permiten confirmar el hecho con claridad periodística.`;
    recommendation =
      "Verifica esta noticia en medios reconocidos antes de compartirla.";
  }

  return {
    classification,
    confidence,
    explanation,
    recommendation,
    engine: "factcheck",
  };
}

function buildSourceSignals(evidence: EvidenceScore, totalSources: number, userText: string): Signal[] {
  const result: Signal[] = [];
  const { supporting, contradicting, neutral } = evidence;
  const commercialCount = neutral.filter((e) => isCommercialContent(e.source)).length;

  if (commercialCount >= 2 && isIncidentClaim(userText)) {
    result.push({
      type: "warning",
      label: "Fuentes irrelevantes para verificar la noticia",
      description: `${commercialCount} resultado${commercialCount === 1 ? "" : "s"} son páginas comerciales o directorios (reparaciones, Yelp, etc.) y no confirman el hecho noticioso.`,
    });
  }

  if (contradicting.length > 0) {
    result.push({
      type: "negative",
      label: "Fuentes que desmienten la afirmación",
      description: `${contradicting.length} fuente${contradicting.length === 1 ? "" : "s"} real${contradicting.length === 1 ? "" : "es"} califican o refutan este contenido como falso o engañoso.`,
    });
  }

  if (supporting.length > 0) {
    result.push({
      type: "positive",
      label: "Fuentes que respaldan la afirmación",
      description: `${supporting.length} fuente${supporting.length === 1 ? "" : "s"} real${supporting.length === 1 ? "" : "es"} confirman o corroboran este contenido con datos verificables.`,
    });
  }

  if (result.length === 0 && totalSources > 0) {
    result.push({
      type: "warning",
      label: "Fuentes consultadas sin postura clara",
      description: `Factify consultó ${totalSources} fuente${totalSources === 1 ? "" : "s"}, pero ninguna permitió confirmar ni desmentir la afirmación con suficiente claridad.`,
    });
  }

  return result;
}

function resolveAnalysisOrigin(
  engine: VerificationEngine,
  providers: string[],
  factCheck: FactCheckMatch | null,
  sources: VerifiedSource[],
): AnalysisOrigin {
  if (factCheck?.classification) return "Verificación externa encontrada";
  if (engine === "factcheck" && providers.length > 0) {
    return "Análisis textual + verificación externa";
  }
  if (sources.length > 0 && providers.length === 0) {
    return "Sin verificación externa disponible";
  }
  if (providers.length === 0) {
    return "Análisis textual local";
  }
  return "Sin verificación externa disponible";
}

function externalEvidenceSupportsFalse(
  evidence: EvidenceScore,
  factCheck: FactCheckMatch | null,
): boolean {
  if (factCheck?.classification === "falso") return true;
  return evidence.contradicting.some((e) => e.relevance >= 0.35);
}

function buildSourceStats(evidence: EvidenceScore, totalSources: number): SourceStats {
  const support = evidence.supporting.length;
  const contradict = evidence.contradicting.length;
  const neutral = evidence.neutral.filter((e) => e.relevance >= 0.25).length;
  const irrelevant = Math.max(0, totalSources - support - contradict - neutral);
  return { support, contradict, neutral, irrelevant, total: totalSources };
}

function annotateSourceMetadata(
  sources: VerifiedSource[],
  evidence: EvidenceScore,
): VerifiedSource[] {
  const scoredByUrl = new Map<string, ScoredEvidence>();
  for (const entry of [...evidence.supporting, ...evidence.contradicting, ...evidence.neutral]) {
    scoredByUrl.set(entry.source.url, entry);
  }

  return sources.map((source) => {
    const scored = scoredByUrl.get(source.url);
    const host = getHost(source.url);
    return {
      ...source,
      lowRelevance: scored ? scored.relevance < MIN_SOURCE_RELEVANCE : undefined,
      nonJournalistic: isCommercialContent(source) || isLowCredibilityHost(host),
    };
  });
}

/**
 * Ejecuta la verificación completa. Siempre devuelve un resultado utilizable:
 * combina la heurística local (señales de estilo) con la evidencia, la postura
 * de las fuentes reales y el veredicto profesional cuando está disponible.
 */
export async function runVerification(input: VerificationInput): Promise<VerificationPayload> {
  const text = repairUtf8Mojibake((input.text || "").trim());
  const debug: string[] = [];

  if (text.length < MIN_TEXT_LENGTH) {
    throw new Error(`El texto debe contener al menos ${MIN_TEXT_LENGTH} caracteres.`);
  }

  if (!input.skipCache) {
    const cached = await readVerificationCache(text, debug);
    if (cached) {
      return cached as unknown as VerificationPayload;
    }
  }

  const base = analyzeContent(text);
  const providers: string[] = [];

  let factCheck: FactCheckMatch | null = null;
  let tavilySources: VerifiedSource[] = [];

  if (!input.skipExternal) {
    [factCheck, tavilySources] = await Promise.all([
      queryFactCheck(text, debug),
      queryTavily(text),
    ]);
    if (factCheck) providers.push("factcheck");
    if (tavilySources.length) providers.push("tavily");
  } else {
    debug.push("evaluación: skipExternal activo (solo análisis local)");
  }

  const sources: VerifiedSource[] = [];
  if (factCheck) sources.push(factCheck.source);
  sources.push(...tavilySources);

  const evidence = analyzeEvidenceSources(sources, text);
  const sourceVerdict = input.skipExternal
    ? null
    : computeVerdictFromSources(evidence, factCheck, text, sources.length);
  const sourceStats = buildSourceStats(evidence, sources.length);

  let classification: Classification = base.classification;
  let confidence = base.confidence;
  let explanation = base.explanation;
  let recommendation = base.recommendation;
  let engine: VerificationEngine = "local";

  if (sourceVerdict) {
    classification = sourceVerdict.classification;
    confidence = sourceVerdict.confidence;
    explanation = sourceVerdict.explanation;
    recommendation = sourceVerdict.recommendation;
    engine = sourceVerdict.engine;

    const externalInconclusive =
      sourceVerdict.classification === "dudoso" && evidence.activeWeight < 0.5;

    if (externalInconclusive) {
      if (base.classification === "confiable" && isInstitutionalConfiableStyle(text)) {
        classification = "confiable";
        confidence = base.confidence;
        explanation = base.explanation;
        recommendation = base.recommendation;
        engine = "local";
      } else if (base.classification === "falso" && isManifestlyFalseClaim(text)) {
        classification = "falso";
        confidence = base.confidence;
        explanation = base.explanation;
        recommendation = base.recommendation;
        engine = "local";
      } else if (base.classification === "confiable" && base.confidence >= 70) {
        classification = "confiable";
        confidence = base.confidence;
        explanation = base.explanation;
        recommendation = base.recommendation;
        engine = "local";
      }
    }

    if (
      classification === "falso" &&
      !externalEvidenceSupportsFalse(evidence, factCheck) &&
      !isManifestlyFalseClaim(text)
    ) {
      classification = "dudoso";
      confidence = Math.min(confidence, 72);
      explanation =
        "El contenido presenta señales de riesgo, pero no se encontró evidencia externa suficiente para clasificarlo como falso.";
      recommendation =
        "Contrasta esta información en medios reconocidos o verificadores profesionales antes de compartirla.";
    }
  }

  const deceasedCheck = await isImpossibleDeceasedClaim(text);
  if (deceasedCheck) {
    const yearsSince = new Date().getFullYear() - deceasedCheck.deathYear;
    classification = "falso";
    confidence = Math.min(98, Math.max(86, 88 + Math.min(10, yearsSince)));
    explanation = `${deceasedCheck.name} falleció en ${deceasedCheck.deathYear} hace ${yearsSince} años. Es imposible que realice actividades después de su fallecimiento.`;
    recommendation = "No compartas esta información. La persona mencionada falleció y no puede realizar dicha actividad.";
    engine = "local";
  }

  const analysisOrigin = resolveAnalysisOrigin(engine, providers, factCheck, sources);
  const preliminaryLocal =
    engine === "local" ||
    (analysisOrigin === "Sin verificación externa disponible" && classification !== "confiable");

  if (preliminaryLocal && classification === "confiable" && engine === "local") {
    explanation = `Clasificación preliminar basada en señales textuales. ${explanation}`;
  }

  if (
    analysisOrigin === "Sin verificación externa disponible" &&
    !factCheck &&
    sources.length > 0
  ) {
    explanation = `${explanation} No se encontró una verificación externa previa; el resultado corresponde a una estimación basada en señales textuales y fuentes consultadas.`;
  }

  const signals = base.signals.filter(
    (s) =>
      s.label !== "Ausencia de fuentes identificables" &&
      s.label !== "Verificación contrastada con fuentes reales" &&
      s.label !== "Las fuentes consultadas contradicen la afirmación" &&
      s.label !== "Varias fuentes confirman la afirmación",
  );

  if (sources.length > 0) {
    signals.unshift(...buildSourceSignals(evidence, sources.length, text));
  }

  const annotatedSources = annotateSourceMetadata(sources, evidence).slice(0, 6);

  const payload: VerificationPayload = {
    classification,
    confidence,
    signals,
    explanation,
    recommendation,
    engine,
    analysisOrigin,
    preliminaryLocal,
    prototypeVersion: FACTIFY_PROTOTYPE_VERSION,
    sources: annotatedSources,
    inputText: text,
    providers,
    debug,
    fromCache: false,
    sourceStats,
  };

  if (!input.skipCache) {
    void writeVerificationCache(text, payload as unknown as Record<string, unknown>, debug);
  }

  return payload;
}
