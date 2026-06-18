/**
 * Caché de verificaciones en Supabase (opcional).
 * Reduce llamadas repetidas a APIs externas y acelera respuestas frecuentes.
 *
 * Requiere SUPABASE_URL + SUPABASE_SERVICE_KEY y la tabla verification_cache
 * (ver supabase/schema.sql).
 */

import { createHash } from "node:crypto";
import { normalizeText } from "../../shared/analyzer.ts";

const DEFAULT_TTL_HOURS = 48;

/** Incrementar cuando cambie la lógica de verificación (invalida entradas antiguas). */
const CACHE_LOGIC_VERSION = "v6";

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function cacheKeyFor(text: string): string {
  const material = `${CACHE_LOGIC_VERSION}|${normalizeText(text.trim())}`;
  return createHash("sha256").update(material).digest("hex");
}

function ttlHours(): number {
  const raw = env("CACHE_TTL_HOURS");
  const n = raw ? Number(raw) : DEFAULT_TTL_HOURS;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL_HOURS;
}

function supabaseConfig(): { url: string; key: string } | null {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_KEY");
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

/** Lee un resultado cacheado si existe y no expiró. */
export async function readVerificationCache(
  text: string,
  debug: string[],
): Promise<Record<string, unknown> | null> {
  const cfg = supabaseConfig();
  if (!cfg) return null;

  const key = cacheKeyFor(text);
  const now = new Date().toISOString();
  const endpoint =
    `${cfg.url}/rest/v1/verification_cache` +
    `?cache_key=eq.${encodeURIComponent(key)}` +
    `&expires_at=gt.${encodeURIComponent(now)}` +
    `&select=payload&limit=1`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
      },
    });
    if (!res.ok) {
      debug.push(`cache: lectura HTTP ${res.status}`);
      return null;
    }
    const rows: { payload: Record<string, unknown> }[] = await res.json();
    if (!rows?.[0]?.payload) return null;
    debug.push("cache: hit");
    return { ...rows[0].payload, fromCache: true };
  } catch (e: any) {
    debug.push(`cache: lectura falló (${e?.message ?? "error"})`);
    return null;
  }
}

/** Guarda el resultado en Supabase (upsert). */
export async function writeVerificationCache(
  text: string,
  payload: Record<string, unknown>,
  debug: string[],
): Promise<void> {
  const cfg = supabaseConfig();
  if (!cfg) return;

  const key = cacheKeyFor(text);
  const expires = new Date(Date.now() + ttlHours() * 60 * 60 * 1000).toISOString();
  const body = {
    cache_key: key,
    query_text: text.trim().slice(0, 500),
    payload: { ...payload, fromCache: false },
    expires_at: expires,
  };

  try {
    const res = await fetch(`${cfg.url}/rest/v1/verification_cache`, {
      method: "POST",
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      debug.push(`cache: escritura HTTP ${res.status}`);
      return;
    }
    debug.push("cache: guardado");
  } catch (e: any) {
    debug.push(`cache: escritura falló (${e?.message ?? "error"})`);
  }
}
