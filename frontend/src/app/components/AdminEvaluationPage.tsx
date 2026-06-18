/**
 * Panel técnico oculto — /admin/evaluation
 * No aparece en la navegación pública. Requiere clave de administración.
 */
import { useEffect, useState } from "react";
import { BarChart3, KeyRound, Play, ShieldCheck } from "../../components/Icons";

interface EvaluationReport {
  prototype_version: string;
  executed_at: string;
  analysis_strategy: string;
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  false_positives: number;
  false_positive_rate: number;
  false_negatives: number;
  false_negative_rate: number;
  average_response_time_ms: number;
  confusion_matrix: Record<string, Record<string, number>>;
  results: Array<{
    id: number;
    title: string;
    expected_classification: string;
    obtained_classification: string;
    correct: boolean;
    confidence: number;
    response_time_ms: number;
    analysis_origin: string;
    engine: string;
  }>;
}

const ADMIN_KEY_STORAGE = "factify.admin.key.v2";

export function AdminEvaluationPage() {
  const [adminKey, setAdminKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<EvaluationReport | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(ADMIN_KEY_STORAGE);
    if (saved) {
      setAdminKey(saved);
      setUnlocked(true);
    }
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey.trim()) {
      setError("Ingresa la clave de administración.");
      return;
    }
    sessionStorage.setItem(ADMIN_KEY_STORAGE, adminKey.trim());
    setUnlocked(true);
    setError("");
  };

  const runEvaluation = async () => {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const key = sessionStorage.getItem(ADMIN_KEY_STORAGE) ?? adminKey;
      const res = await fetch(`/api/evaluation?key=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setReport(data);
    } catch (err: any) {
      setError(err?.message ?? "No se pudo ejecutar la evaluación.");
    } finally {
      setLoading(false);
    }
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 factify-app-bg">
        <form onSubmit={handleUnlock} className="surface-panel p-8 max-w-md w-full">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="w-5 h-5 text-blue-600" />
            <h1 className="text-gray-900 dark:text-gray-100" style={{ fontSize: "1.25rem", fontWeight: 700 }}>
              Acceso técnico Factify
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-4" style={{ fontSize: "0.875rem", lineHeight: 1.6 }}>
            Panel oculto para evaluación del prototipo (presentación / informe).
          </p>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Clave de administración"
            className="field mb-3"
          />
          {error && <p className="text-red-600 mb-3" style={{ fontSize: "0.85rem" }}>{error}</p>}
          <button type="submit" className="btn-primary w-full">Ingresar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen factify-app-bg">
      <div className="factify-shell py-10 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
              <h1 className="text-gray-900 dark:text-gray-100" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
                Evaluación técnica (30 casos)
              </h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.875rem" }}>
              Ruta oculta — no visible en el menú público. Versión del prototipo: {report?.prototype_version ?? "0.2.0"}
            </p>
          </div>
          <button
            onClick={runEvaluation}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Evaluando…
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Ejecutar evaluación
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700" style={{ fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        {report && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Exactitud", value: `${report.accuracy}%`, sub: `${report.correct}/${report.total}` },
                { label: "Falsos positivos", value: report.false_positives, sub: `${report.false_positive_rate}% sobre confiables` },
                { label: "Falsos negativos", value: report.false_negatives, sub: `${report.false_negative_rate}% sobre dudosas/falsas` },
                { label: "Tiempo promedio", value: `${report.average_response_time_ms} ms`, sub: new Date(report.executed_at).toLocaleString("es") },
              ].map((item) => (
                <div key={item.label} className="surface-panel p-4">
                  <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.78rem" }}>{item.label}</p>
                  <p className="text-gray-900 dark:text-gray-100" style={{ fontSize: "1.5rem", fontWeight: 700 }}>{item.value}</p>
                  <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>{item.sub}</p>
                </div>
              ))}
            </div>

            <div className="surface-panel p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h2 className="text-gray-900 dark:text-gray-100" style={{ fontWeight: 600 }}>Matriz de confusión</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-4">Esperado \\ Obtenido</th>
                      <th className="py-2 px-2">Confiable</th>
                      <th className="py-2 px-2">Dudosa</th>
                      <th className="py-2 px-2">Falsa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.confusion_matrix).map(([expected, row]) => (
                      <tr key={expected} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="py-2 pr-4 font-medium text-gray-800 dark:text-gray-200">{expected}</td>
                        {["Confiable", "Dudosa", "Falsa"].map((col) => (
                          <td key={col} className="py-2 px-2 text-center text-gray-700 dark:text-gray-300">
                            {row[col] ?? 0}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="surface-panel overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-gray-900 dark:text-gray-100" style={{ fontWeight: 600 }}>Detalle de casos</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ fontSize: "0.8rem" }}>
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500">
                    <tr>
                      <th className="text-left p-3">ID</th>
                      <th className="text-left p-3">Título</th>
                      <th className="text-left p-3">Esperada</th>
                      <th className="text-left p-3">Obtenida</th>
                      <th className="text-left p-3">OK</th>
                      <th className="text-left p-3">Conf.</th>
                      <th className="text-left p-3">ms</th>
                      <th className="text-left p-3">Origen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.results.map((row) => (
                      <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="p-3">{row.id}</td>
                        <td className="p-3 max-w-xs truncate" title={row.title}>{row.title}</td>
                        <td className="p-3">{row.expected_classification}</td>
                        <td className="p-3 capitalize">{row.obtained_classification}</td>
                        <td className="p-3">{row.correct ? "✓" : "✗"}</td>
                        <td className="p-3">{row.confidence}%</td>
                        <td className="p-3">{row.response_time_ms}</td>
                        <td className="p-3 max-w-[10rem] truncate" title={row.analysis_origin}>{row.analysis_origin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!report && !loading && (
          <div className="surface-panel p-8 text-center text-gray-500 dark:text-gray-400">
            Pulsa <strong>Ejecutar evaluación</strong> para procesar los 30 casos de{" "}
            <code>data/evaluation_news.json</code>.
          </div>
        )}
      </div>
    </div>
  );
}
