function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

export async function recordEvent(event: {
  event_type: string;
  classification?: string;
  confidence?: number;
  input_kind?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: boolean }> {
  const cfg = supabaseConfig();
  if (!cfg) return { ok: false };

  try {
    const res = await fetch(`${cfg.url}/rest/v1/analytics_events`, {
      method: "POST",
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: event.event_type,
        classification: event.classification ?? null,
        confidence: event.confidence ?? null,
        input_kind: event.input_kind ?? null,
        metadata: event.metadata ? { query: String(event.metadata.query ?? "").slice(0, 60) } : {},
      }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

export async function queryAnalytics(): Promise<{
  events: Array<Record<string, unknown>>;
  error?: string;
}> {
  const cfg = supabaseConfig();
  if (!cfg) {
    return { events: [], error: "Supabase no configurado" };
  }

  try {
    const res = await fetch(`${cfg.url}/rest/v1/analytics_events?order=created_at.desc&limit=10000`, {
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
      },
    });
    if (!res.ok) {
      return { events: [], error: `HTTP ${res.status}` };
    }
    const events = (await res.json()) as Array<Record<string, unknown>>;
    return { events };
  } catch (e: any) {
    return { events: [], error: e?.message ?? "error" };
  }
}
