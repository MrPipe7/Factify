type InputKind = "text" | "url" | "video";

interface TrackEvent {
  event_type: string;
  classification?: string;
  confidence?: number;
  input_kind?: InputKind;
  metadata?: Record<string, unknown>;
}

export async function trackEvent(event: TrackEvent): Promise<void> {
  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch {
    // silently ignore tracking failures
  }
}

export async function fetchAnalytics(): Promise<{
  events: Array<Record<string, unknown>>;
  error?: string;
}> {
  try {
    const res = await fetch("/api/analytics");
    if (!res.ok) return { events: [], error: `HTTP ${res.status}` };
    return await res.json() as { events: Array<Record<string, unknown>>; error?: string };
  } catch (e: any) {
    return { events: [], error: e?.message ?? "fetch_failed" };
  }
}
