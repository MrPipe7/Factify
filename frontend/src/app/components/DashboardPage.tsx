import { useEffect, useState } from "react";
import { BarChart3, CheckCircle, AlertTriangle, XCircle, RefreshCw } from "../../components/Icons";
import { fetchAnalytics } from "../utils/analyticsClient";

interface AnalyticsEvent {
  id: number;
  event_type: string;
  classification: string | null;
  confidence: number | null;
  input_kind: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function countBy(items: Record<string, unknown>[], key: string): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of items) {
    const k = String(item[key] ?? "unknown");
    map[k] = (map[k] ?? 0) + 1;
  }
  return map;
}

export function DashboardPage() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    fetchAnalytics().then((res) => {
      setLoading(false);
      if (res.error) {
        setError(res.error);
      } else {
        setEvents(res.events as unknown as AnalyticsEvent[]);
      }
    });
  };

  useEffect(() => { load(); }, []);

  const verifications = events.filter((e: AnalyticsEvent) => e.event_type === "verification_completed");
  const shares = events.filter((e: AnalyticsEvent) => e.event_type === "share_intent");

  const byClassification = countBy(verifications, "classification");
  const totalVerifications = verifications.length;
  const totalShares = shares.length;

  const maxClass = Math.max(...Object.values(byClassification), 1);

  const classificationLabels: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
    confiable: { label: "Confiable", color: "#22c55e", icon: CheckCircle },
    dudoso: { label: "Dudoso", color: "#f59e0b", icon: AlertTriangle },
    falso: { label: "Falso", color: "#ef4444", icon: XCircle },
  };

  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-gray-900" style={{ fontSize: "1.5rem", fontWeight: 700 }}>Estadísticas</h1>
              <p className="text-gray-500" style={{ fontSize: "0.85rem" }}>Resumen del uso de Factify</p>
            </div>
          </div>
          <button onClick={load} disabled={loading} className="btn-ghost">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700" style={{ fontSize: "0.875rem" }}>{error}</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400" style={{ fontSize: "0.875rem" }}>Cargando estadísticas...</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="surface-panel p-5 rounded-xl">
                <p className="text-gray-400 mb-1" style={{ fontSize: "0.75rem", fontWeight: 600 }}>VERIFICACIONES</p>
                <p className="text-gray-900" style={{ fontSize: "2rem", fontWeight: 700 }}>{totalVerifications}</p>
              </div>
              <div className="surface-panel p-5 rounded-xl">
                <p className="text-gray-400 mb-1" style={{ fontSize: "0.75rem", fontWeight: 600 }}>VECES COMPARTIDO</p>
                <p className="text-gray-900" style={{ fontSize: "2rem", fontWeight: 700 }}>{totalShares}</p>
              </div>
            </div>

            <div className="surface-panel p-6 rounded-xl mb-6">
              <h2 className="text-gray-800 mb-4" style={{ fontSize: "1rem", fontWeight: 600 }}>
                Clasificaciones
              </h2>
              <div className="flex flex-col gap-3">
                {(["confiable", "dudoso", "falso"] as const).map((key) => {
                  const cfg = classificationLabels[key];
                  const count = byClassification[key] ?? 0;
                  const pct = totalVerifications > 0 ? (count / totalVerifications) * 100 : 0;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <cfg.icon className={`w-4 h-4`} style={{ color: cfg.color }} />
                          <span className="text-gray-700" style={{ fontSize: "0.875rem" }}>{cfg.label}</span>
                        </div>
                        <span className="text-gray-500" style={{ fontSize: "0.8rem" }}>{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(count / maxClass) * 100}%`, background: cfg.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="surface-panel p-6 rounded-xl">
              <h2 className="text-gray-800 mb-4" style={{ fontSize: "1rem", fontWeight: 600 }}>
                Últimas preguntas realizadas
              </h2>
              {events.length === 0 ? (
                <p className="text-gray-400 text-center py-8" style={{ fontSize: "0.875rem" }}>
                  Aún no hay eventos registrados. Realiza verificaciones para ver estadísticas.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left" style={{ fontSize: "0.85rem" }}>
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-100">
                        <th className="pb-2 pr-4" style={{ fontWeight: 500 }}>Contenido</th>
                        <th className="pb-2 pr-4" style={{ fontWeight: 500 }}>Tipo</th>
                        <th className="pb-2 pr-4" style={{ fontWeight: 500 }}>Clasificación</th>
                        <th className="pb-2 pr-4" style={{ fontWeight: 500 }}>Confianza</th>
                        <th className="pb-2" style={{ fontWeight: 500 }}>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.slice(0, 50).map((ev: AnalyticsEvent) => {
                        const query = (ev.metadata as Record<string, unknown> | null)?.query as string | undefined;
                        return (
                        <tr key={ev.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="py-2 pr-4 text-gray-700 max-w-xs truncate">
                            {query ?? <span className="text-gray-300">—</span>}
                          </td>
                          <td className="py-2 pr-4 text-gray-600">{ev.input_kind === "text" ? "texto" : ev.input_kind ?? "—"}</td>
                          <td className="py-2 pr-4">
                            {ev.classification ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                ev.classification === "confiable" ? "bg-green-100 text-green-700" :
                                ev.classification === "dudoso" ? "bg-amber-100 text-amber-700" :
                                "bg-red-100 text-red-700"
                              }`}>
                                {ev.classification}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="py-2 pr-4 text-gray-600">{ev.confidence ?? "—"}</td>
                          <td className="py-2 text-gray-400" style={{ fontSize: "0.8rem" }}>
                            {new Date(ev.created_at).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}