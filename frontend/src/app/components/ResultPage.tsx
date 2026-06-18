import { useState } from "react";
import { CheckCircle, AlertTriangle, XCircle, RotateCcw, Share2, Info, ChevronDown, ChevronUp, ShieldCheck, ExternalLink, Globe } from "../../components/Icons";
import { AnalysisResult, type VerifiedSource } from "../utils/analyzer";
import { AlertModal } from "./AlertModal";
import { trackEvent } from "../utils/analyticsClient";

interface ResultPageProps {
  result: AnalysisResult;
  onAnalyzeAgain: () => void;
}

const classificationConfig = {
  confiable: {
    icon: CheckCircle,
    label: "CONFIABLE",
    cardClass: "bg-green-50 border-green-200",
    iconWrapClass: "bg-green-100",
    textClass: "text-green-700",
    badgeClass: "bg-green-100 text-green-700 border border-green-200",
    barColor: "#22c55e",
    description: "El contenido presenta características asociadas a información confiable.",
  },
  dudoso: {
    icon: AlertTriangle,
    label: "DUDOSO",
    cardClass: "bg-amber-50 border-amber-200",
    iconWrapClass: "bg-amber-100",
    textClass: "text-amber-700",
    badgeClass: "bg-amber-100 text-amber-700 border border-amber-200",
    barColor: "#f59e0b",
    description: "El contenido requiere verificación adicional antes de compartirse.",
  },
  falso: {
    icon: XCircle,
    label: "PROBABLEMENTE FALSO",
    cardClass: "bg-red-50 border-red-200",
    iconWrapClass: "bg-red-100",
    textClass: "text-red-700",
    badgeClass: "bg-red-100 text-red-700 border border-red-200",
    barColor: "#ef4444",
    description: "El contenido presenta múltiples señales asociadas a desinformación.",
  },
};

export function ResultPage({ result, onAnalyzeAgain }: ResultPageProps) {
  const [showAlert, setShowAlert] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [shareNotice, setShareNotice] = useState("");

  const config = classificationConfig[result.classification];
  const Icon = config.icon;
  const shouldShowAlert = result.classification !== "confiable";

  const sources = result.sources ?? [];

  const engineLabel =
    result.analysisOrigin ??
    (result.engine === "factcheck"
      ? "Veredicto basado en fuentes reales"
      : sources.length > 0
        ? "Estimación por señales + fuentes consultadas"
        : "Estimación por señales (modo sin conexión)");

  const originDetail =
    result.analysisOrigin === "Sin verificación externa disponible" ||
    result.analysisOrigin === "Análisis textual local" ||
    result.preliminaryLocal
      ? "No se encontró una verificación externa previa. El resultado corresponde a una estimación basada en señales textuales."
      : null;

  const confidenceHint =
    result.engine === "factcheck"
      ? "Consenso entre las fuentes consultadas"
      : "Nivel de confianza del análisis";

  const stanceLabel = (stance?: VerifiedSource["stance"]) => {
    if (stance === "support") return { text: "Respaldan", className: "bg-green-100 text-green-700 border-green-200" };
    if (stance === "contradict") return { text: "Desmienten", className: "bg-red-100 text-red-700 border-red-200" };
    return { text: "Consultada", className: "bg-gray-100 text-gray-600 border-gray-200" };
  };

  const hostOf = (url: string): string => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  const handleShare = () => {
    trackEvent({
      event_type: "share_intent",
      classification: result.classification,
      confidence: result.confidence,
    });

    if (shouldShowAlert) {
      setShowAlert(true);
    } else {
      if (navigator.share) {
        navigator.share({
          title: "Factify — Verificación de noticias",
          text: `Analicé esta noticia con Factify y fue clasificada como: ${config.label}`,
        }).catch(() => {});
      } else if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(`Factify: contenido clasificado como ${config.label}.`)
          .then(() => setShareNotice("Resultado copiado al portapapeles."))
          .catch(() => {});
      }
    }
  };

  const truncated = result.inputText.length > 120;
  const displayText = showFullText ? result.inputText : result.inputText.slice(0, 120);

  const positiveSignals = result.signals.filter((s) => s.type === "positive");
  const negativeSignals = result.signals.filter((s) => s.type === "negative");
  const warningSignals = result.signals.filter((s) => s.type === "warning");

  return (
    <>
      {showAlert && (
        <AlertModal
          classification={result.classification}
          onClose={() => setShowAlert(false)}
          onContinue={() => setShowAlert(false)}
        />
      )}

      <div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <button onClick={onAnalyzeAgain} className="btn-ghost mb-6 factify-enter factify-enter-d1">
            <RotateCcw className="w-4 h-4" />
            Analizar otro contenido
          </button>

          {/* Main result card */}
          <div className={`surface-panel surface-panel-accent rounded-2xl border-2 p-6 sm:p-8 mb-5 factify-enter factify-enter-scale factify-enter-d2 ${config.cardClass}`}>
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${config.iconWrapClass}`}>
                <Icon className={`w-9 h-9 ${config.textClass}`} />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <p className="factify-section-label">Resultado del análisis</p>
                  <span
                    className={`px-3 py-0.5 rounded-full ${config.badgeClass}`}
                    style={{ fontSize: "0.75rem", fontWeight: 600 }}
                  >
                    {engineLabel}
                  </span>
                </div>
                <h2
                  className={`mb-1 ${config.textClass}`}
                  style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em" }}
                >
                  {config.label}
                </h2>
                <p className="text-gray-600" style={{ fontSize: "0.925rem" }}>{config.description}</p>

                {/* Confidence bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-gray-500" style={{ fontSize: "0.8rem" }}>{confidenceHint}</span>
                    <span className={config.textClass} style={{ fontSize: "0.85rem", fontWeight: 600 }}>{result.confidence}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${result.confidence}%`, background: config.barColor }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {shouldShowAlert && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 mb-5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <p className="text-orange-800" style={{ fontSize: "0.86rem", lineHeight: 1.55 }}>
                  <strong>Alerta preventiva activa:</strong> este contenido requiere verificación
                  adicional antes de compartirse.
                </p>
              </div>
            </div>
          )}

          {/* Analyzed text preview */}
          <div className="surface-panel p-5 mb-5">
            <p className="factify-section-label mb-2">Contenido analizado</p>
            <p className="text-gray-700" style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
              {displayText}
              {truncated && !showFullText && "..."}
            </p>
            {truncated && (
              <button
                onClick={() => setShowFullText(!showFullText)}
                className="mt-2 flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                style={{ fontSize: "0.825rem" }}
              >
                {showFullText ? (
                  <><ChevronUp className="w-3.5 h-3.5" /> Mostrar menos</>
                ) : (
                  <><ChevronDown className="w-3.5 h-3.5" /> Mostrar texto completo</>
                )}
              </button>
            )}
          </div>

          <div className="surface-panel p-4 mb-5 border border-gray-100 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400 mb-1" style={{ fontSize: "0.78rem", fontWeight: 600 }}>
              Origen del resultado
            </p>
            <p className="text-gray-700 dark:text-gray-300" style={{ fontSize: "0.875rem" }}>
              {engineLabel}
            </p>
            {originDetail && (
              <p className="text-gray-500 dark:text-gray-400 mt-2" style={{ fontSize: "0.8rem", lineHeight: 1.55 }}>
                {originDetail}
              </p>
            )}
          </div>

          {/* Signals detected */}
          {result.signals.length > 0 && (
            <div className="surface-panel p-5 mb-5">
              <h3 className="text-gray-800 mb-4" style={{ fontSize: "1rem", fontWeight: 600 }}>
                Señales detectadas
              </h3>
              <div className="flex flex-col gap-3">
                {negativeSignals.map((signal, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-red-700" style={{ fontSize: "0.875rem", fontWeight: 600 }}>{signal.label}</p>
                      <p className="text-red-600 mt-0.5" style={{ fontSize: "0.825rem", lineHeight: 1.5 }}>{signal.description}</p>
                    </div>
                  </div>
                ))}
                {warningSignals.map((signal, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-amber-700" style={{ fontSize: "0.875rem", fontWeight: 600 }}>{signal.label}</p>
                      <p className="text-amber-600 mt-0.5" style={{ fontSize: "0.825rem", lineHeight: 1.5 }}>{signal.description}</p>
                    </div>
                  </div>
                ))}
                {positiveSignals.map((signal, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-green-700" style={{ fontSize: "0.875rem", fontWeight: 600 }}>{signal.label}</p>
                      <p className="text-green-600 mt-0.5" style={{ fontSize: "0.825rem", lineHeight: 1.5 }}>{signal.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explanation */}
          <div className="surface-panel p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-gray-800" style={{ fontSize: "1rem", fontWeight: 600 }}>
                ¿Por qué fue clasificado así?
              </h3>
            </div>
            <p className="text-gray-600" style={{ fontSize: "0.9rem", lineHeight: 1.7 }}>
              {result.explanation}
            </p>
          </div>

          {/* Recommendation */}
          <div className="factify-callout mb-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="factify-callout-title mb-0">Recomendación</h3>
            </div>
            <p className="text-blue-700 dark:text-blue-300" style={{ fontSize: "0.9rem", lineHeight: 1.7 }}>
              {result.recommendation}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Fuentes oficiales", "Medios periodísticos", "Portales institucionales"].map((label) => (
                <span
                  key={label}
                  className="px-3 py-1 rounded-full text-blue-700 border border-blue-200 bg-white"
                  style={{ fontSize: "0.8rem" }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Sources consulted */}
          {sources.length > 0 && (
            <div className="surface-panel p-5 mb-5">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-5 h-5 text-blue-600" />
                <h3 className="text-gray-800" style={{ fontSize: "1rem", fontWeight: 600 }}>
                  Fuentes consultadas por Factify
                </h3>
              </div>
              <p className="text-gray-500 mb-4" style={{ fontSize: "0.82rem", lineHeight: 1.5 }}>
                Cada fuente fue analizada para ver si respalda, desmiente o no permite concluir sobre la afirmación.
              </p>
              <div className="flex flex-col gap-2.5">
                {sources.map((source, i) => {
                  const badge = stanceLabel(source.stance);
                  return (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="factify-source-link group flex items-start gap-3 p-3 rounded-lg border transition-all"
                  >
                    <span className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-900/35 text-blue-700 dark:text-blue-300 flex items-center justify-center flex-shrink-0 mt-0.5" style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <p className="text-gray-800 dark:text-gray-100 truncate flex-1 min-w-0" style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                          {source.title}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full border flex-shrink-0 ${badge.className}`} style={{ fontSize: "0.7rem", fontWeight: 600 }}>
                          {badge.text}
                        </span>
                      </div>
                      {source.snippet && (
                        <p className="text-gray-500 dark:text-gray-400 mt-0.5" style={{ fontSize: "0.8rem", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {source.snippet}
                        </p>
                      )}
                      <span className="text-blue-600 dark:text-blue-400 mt-1 inline-flex items-center gap-1" style={{ fontSize: "0.78rem" }}>
                        {source.publisher || hostOf(source.url)}
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="surface-subtle p-4 mb-6">
            <p className="text-gray-400" style={{ fontSize: "0.78rem", lineHeight: 1.6 }}>
              <strong className="text-gray-500">Aviso importante:</strong>{" "}
              {result.engine === "factcheck"
                ? "Esta clasificación se basa en el análisis de fuentes reales consultadas por Factify. El porcentaje refleja el consenso entre fuentes que respaldan o desmienten la afirmación."
                : "Esta clasificación es una estimación basada en señales de texto cuando no hay suficientes fuentes concluyentes."}{" "}
              Factify no reemplaza el criterio propio del lector. En caso de duda, consulta directamente las referencias listadas.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={onAnalyzeAgain} className="btn-ghost flex-1 justify-center py-3">
              <RotateCcw className="w-4 h-4" />
              Analizar otro
            </button>
            <button
              onClick={handleShare}
              className={shouldShowAlert ? "btn-accent-warn" : "btn-primary flex-1 justify-center"}
            >
              <Share2 className="w-4 h-4" />
              {shouldShowAlert ? "Compartir (ver advertencia)" : "Compartir resultado"}
            </button>
          </div>
          {shareNotice && (
            <p className="text-blue-600 mt-2 text-center" style={{ fontSize: "0.82rem" }}>
              {shareNotice}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
