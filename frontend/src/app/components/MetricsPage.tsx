/** Panel de metricas del prototipo — no enlazado en la app publica. Reutilizable en presentaciones. */
import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  Target,
  Timer,
  XCircle,
} from "../../components/Icons";
import { AnalysisResult, Classification } from "../utils/analyzer";
import { AppMetrics } from "../types/metrics";
import { verifyContent } from "../utils/verifyClient";
import { EVALUATION_DATASET } from "../data/evaluationDataset";
import { evaluateDataset, type EvaluationMetrics } from "../utils/evaluation";

interface MetricsPageProps {
  history: AnalysisResult[];
  metrics: AppMetrics;
  onResetMetrics: () => void;
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function MetricsPage({ history, metrics, onResetMetrics }: MetricsPageProps) {
  const [evalResult, setEvalResult] = useState<EvaluationMetrics | null>(null);
  const [evalRunning, setEvalRunning] = useState(false);
  const [evalProgress, setEvalProgress] = useState({ done: 0, total: EVALUATION_DATASET.length });

  const runEvaluation = async () => {
    if (evalRunning) return;
    setEvalRunning(true);
    setEvalResult(null);
    setEvalProgress({ done: 0, total: EVALUATION_DATASET.length });
    try {
      const result = await evaluateDataset(
        EVALUATION_DATASET,
        async (text): Promise<Classification> => (await verifyContent(text, "text")).classification,
        (done, total) => setEvalProgress({ done, total }),
      );
      setEvalResult(result);
    } finally {
      setEvalRunning(false);
    }
  };

  const avgConfidence =
    history.length > 0
      ? Math.round(history.reduce((acc, item) => acc + item.confidence, 0) / history.length)
      : 0;
  const avgResponseMs =
    metrics.analysesCompleted > 0
      ? Math.round(metrics.totalProcessingMs / metrics.analysesCompleted)
      : 0;

  const completionRate = ratio(metrics.analysesCompleted, metrics.analysisAttempts);

  const classCounts = {
    confiable: history.filter((item) => item.classification === "confiable").length,
    dudoso: history.filter((item) => item.classification === "dudoso").length,
    falso: history.filter((item) => item.classification === "falso").length,
  };

  const textCount = history.filter((item) => item.inputKind === "text").length;
  const urlCount = history.filter((item) => item.inputKind === "url").length;
  const videoCount = history.filter((item) => item.inputKind === "video").length;

  const totalHelpfulness = metrics.helpfulFeedback + metrics.notHelpfulFeedback;
  const helpfulRate = ratio(metrics.helpfulFeedback, totalHelpfulness);

  const totalUnderstanding = metrics.understoodCount + metrics.notUnderstoodCount;
  const understandingRate = ratio(metrics.understoodCount, totalUnderstanding);

  const totalPostIntent = metrics.wouldShareCount + metrics.wouldNotShareCount;
  const postNoShareRate = ratio(metrics.wouldNotShareCount, totalPostIntent);

  const totalPreIntent = metrics.intentBeforeYes + metrics.intentBeforeNo;
  const preNoShareRate = ratio(metrics.intentBeforeNo, totalPreIntent);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
          <div>
            <h1 className="text-gray-900 mb-1" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
              Métricas del prototipo
            </h1>
            <p className="text-gray-500" style={{ fontSize: "0.9rem" }}>
              Registro local de uso para validar resultados del MVP.
            </p>
          </div>
          <button
            onClick={onResetMetrics}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 transition-all"
            style={{ fontSize: "0.875rem" }}
          >
            <RefreshCw className="w-4 h-4" />
            Reiniciar métricas
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            {
              label: "Análisis completados",
              value: metrics.analysesCompleted,
              icon: CheckCircle2,
              textClass: "text-green-700",
              cardClass: "bg-green-50 border-green-200",
            },
            {
              label: "Finalización de flujo",
              value: `${completionRate}%`,
              icon: BarChart3,
              textClass: "text-blue-700",
              cardClass: "bg-blue-50 border-blue-200",
            },
            {
              label: "Tiempo promedio",
              value: `${(avgResponseMs / 1000).toFixed(1)}s`,
              icon: Timer,
              textClass: "text-purple-700",
              cardClass: "bg-purple-50 border-purple-200",
            },
            {
              label: "Confianza promedio",
              value: `${avgConfidence}%`,
              icon: AlertTriangle,
              textClass: "text-amber-700",
              cardClass: "bg-amber-50 border-amber-200",
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-xl border p-4 shadow-sm ${item.cardClass}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500" style={{ fontSize: "0.8rem" }}>
                  {item.label}
                </span>
                <item.icon className={`w-4 h-4 ${item.textClass}`} />
              </div>
              <p className={item.textClass} style={{ fontSize: "1.6rem", fontWeight: 700, lineHeight: 1 }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>
              Distribución de clasificaciones
            </h2>
            {[
              { key: "confiable", label: "Confiable", color: "#16a34a", textClass: "text-green-700", value: classCounts.confiable },
              { key: "dudoso", label: "Dudoso", color: "#d97706", textClass: "text-amber-700", value: classCounts.dudoso },
              { key: "falso", label: "Falso", color: "#dc2626", textClass: "text-red-700", value: classCounts.falso },
            ].map((item) => {
              const pct = ratio(item.value, Math.max(history.length, 1));
              return (
                <div key={item.key} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={item.textClass} style={{ fontSize: "0.875rem", fontWeight: 600 }}>{item.label}</span>
                    <span className="text-gray-500" style={{ fontSize: "0.8rem" }}>
                      {item.value} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: item.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>
              Tipo de contenido analizado
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                <p className="text-blue-700" style={{ fontSize: "0.8rem" }}>Texto</p>
                <p className="text-blue-900" style={{ fontSize: "1.5rem", fontWeight: 700 }}>{textCount}</p>
              </div>
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                <p className="text-indigo-700" style={{ fontSize: "0.8rem" }}>URL</p>
                <p className="text-indigo-900" style={{ fontSize: "1.5rem", fontWeight: 700 }}>{urlCount}</p>
              </div>
              <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
                <p className="text-purple-700" style={{ fontSize: "0.8rem" }}>Video (transcripción)</p>
                <p className="text-purple-900" style={{ fontSize: "1.5rem", fontWeight: 700 }}>{videoCount}</p>
              </div>
            </div>
            <p className="text-gray-500" style={{ fontSize: "0.82rem", lineHeight: 1.6 }}>
              Estas métricas se guardan en el navegador para facilitar pruebas con usuarios sin
              necesitar infraestructura externa.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>
              Calidad percibida por usuarios
            </h2>
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-green-100 bg-green-50 p-3">
                <p className="text-green-700" style={{ fontSize: "0.82rem" }}>Feedback útil</p>
                <p className="text-green-900" style={{ fontSize: "1.4rem", fontWeight: 700 }}>
                  {helpfulRate}% ({metrics.helpfulFeedback}/{Math.max(totalHelpfulness, 1)})
                </p>
              </div>
              <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-3">
                <p className="text-cyan-700" style={{ fontSize: "0.82rem" }}>Comprensión del resultado</p>
                <p className="text-cyan-900" style={{ fontSize: "1.4rem", fontWeight: 700 }}>
                  {understandingRate}% ({metrics.understoodCount}/{Math.max(totalUnderstanding, 1)})
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>
              Impacto en intención de compartir
            </h2>
            <div className="flex flex-col gap-3 mb-3">
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                <p className="text-amber-700" style={{ fontSize: "0.82rem" }}>Antes del análisis: NO compartir</p>
                <p className="text-amber-900" style={{ fontSize: "1.4rem", fontWeight: 700 }}>{preNoShareRate}%</p>
              </div>
              <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
                <p className="text-purple-700" style={{ fontSize: "0.82rem" }}>Después del análisis: NO compartir</p>
                <p className="text-purple-900" style={{ fontSize: "1.4rem", fontWeight: 700 }}>{postNoShareRate}%</p>
              </div>
            </div>
            <p className="text-gray-500" style={{ fontSize: "0.82rem", lineHeight: 1.6 }}>
              Delta observado:{" "}
              <strong>
                {postNoShareRate - preNoShareRate >= 0 ? "+" : ""}
                {postNoShareRate - preNoShareRate} puntos
              </strong>{" "}
              en intención de no compartir sin verificar.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mt-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-gray-500" />
            <p className="text-gray-600" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
              Interacciones preventivas
            </p>
          </div>
          <p className="text-gray-500" style={{ fontSize: "0.82rem", lineHeight: 1.6 }}>
            Alertas activadas: <strong>{metrics.alertsTriggered}</strong> · Compartir cancelado tras alerta:{" "}
            <strong>{metrics.shareCancelled}</strong> · Continuar de todas formas:{" "}
            <strong>{metrics.shareContinued}</strong>
          </p>
        </div>

        {/* Validación de precisión con dataset etiquetado */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mt-8">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              <h2 className="text-gray-900" style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                Precisión del motor de verificación
              </h2>
            </div>
            <button
              onClick={runEvaluation}
              disabled={evalRunning}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #1e4f9c, #3b82f6)", fontSize: "0.85rem", fontWeight: 600 }}
            >
              {evalRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Evaluando {evalProgress.done}/{evalProgress.total}
                </>
              ) : (
                <>
                  <Target className="w-4 h-4" />
                  Evaluar precisión
                </>
              )}
            </button>
          </div>
          <p className="text-gray-500 mb-4" style={{ fontSize: "0.82rem", lineHeight: 1.6 }}>
            Ejecuta {EVALUATION_DATASET.length} noticias pre-clasificadas a través del motor real y compara el
            resultado con la etiqueta correcta. Así se mide de forma transparente la confiabilidad de Factify.
          </p>

          {evalResult && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="text-green-700" style={{ fontSize: "0.78rem" }}>Exactitud (3 clases)</p>
                  <p className="text-green-700" style={{ fontSize: "1.5rem", fontWeight: 700 }}>{evalResult.accuracy}%</p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-blue-700" style={{ fontSize: "0.78rem" }}>Precisión (alerta)</p>
                  <p className="text-blue-700" style={{ fontSize: "1.5rem", fontWeight: 700 }}>{evalResult.precision}%</p>
                </div>
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                  <p className="text-purple-700" style={{ fontSize: "0.78rem" }}>Cobertura (recall)</p>
                  <p className="text-purple-700" style={{ fontSize: "1.5rem", fontWeight: 700 }}>{evalResult.recall}%</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-amber-700" style={{ fontSize: "0.78rem" }}>F1</p>
                  <p className="text-amber-700" style={{ fontSize: "1.5rem", fontWeight: 700 }}>{evalResult.f1}%</p>
                </div>
              </div>
              <p className="text-gray-500" style={{ fontSize: "0.82rem", lineHeight: 1.7 }}>
                Aciertos: <strong>{evalResult.correct}/{evalResult.total}</strong> ·{" "}
                Falsos positivos (confiable marcada como alerta): <strong>{evalResult.falsePositives}</strong> ·{" "}
                Falsos negativos (desinformación que pasó como confiable): <strong>{evalResult.falseNegatives}</strong>
              </p>
              <p className="text-gray-400 mt-1" style={{ fontSize: "0.78rem", lineHeight: 1.6 }}>
                Por clase — Confiable: {evalResult.perClass.confiable.correct}/{evalResult.perClass.confiable.total} ·
                {" "}Dudoso: {evalResult.perClass.dudoso.correct}/{evalResult.perClass.dudoso.total} ·
                {" "}Falso: {evalResult.perClass.falso.correct}/{evalResult.perClass.falso.total}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
