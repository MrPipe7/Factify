import { useRef, useState } from "react";
import { Search, Shield, CheckCircle, AlertTriangle, XCircle, ArrowRight, Link, FileText, Video } from "../../components/Icons";
import { AnalysisResult } from "../utils/analyzer";
import { verifyContent } from "../utils/verifyClient";
import { trackEvent } from "../utils/analyticsClient";
import { WelcomeSection } from "./WelcomeSection";

interface HomePageProps {
  onResult: (result: AnalysisResult) => void;
  onNavigateTips: () => void;
}

type InputKind = "text" | "url" | "video";

const EMPTY_INPUTS: Record<InputKind, string> = { text: "", url: "", video: "" };

export function HomePage({ onResult, onNavigateTips }: HomePageProps) {
  const analyzerRef = useRef<HTMLDivElement>(null);
  const [inputs, setInputs] = useState(EMPTY_INPUTS);
  const [inputType, setInputType] = useState<InputKind>("text");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentInput = inputs[inputType];

  const updateCurrentInput = (value: string) => {
    setInputs((prev) => ({ ...prev, [inputType]: value }));
    setError("");
  };

  const handleAnalyze = () => {
    const trimmedInput = currentInput.trim();
    if (!trimmedInput) {
      setError("Por favor, ingresa una noticia o enlace para analizar.");
      return;
    }
    if (inputType === "url") {
      let url = trimmedInput;
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      try { new URL(url); } catch {
        setError("Ingresa un enlace valido (por ejemplo: https://sitio.com/noticia).");
        return;
      }
    }
    if (inputType !== "url" && trimmedInput.length < 20) {
      setError("El texto debe contener al menos 20 caracteres.");
      return;
    }

    setError("");
    setLoading(true);

    verifyContent(trimmedInput, inputType)
      .then((result) => {
        setLoading(false);
        onResult({ ...result, inputKind: inputType });
        trackEvent({
          event_type: "verification_completed",
          classification: result.classification,
          confidence: result.confidence,
          input_kind: inputType,
          metadata: { query: trimmedInput.slice(0, 300) },
        });
      })
      .catch(() => {
        setLoading(false);
        setError("No se pudo completar el análisis. Inténtalo nuevamente.");
      });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleAnalyze();
    }
  };

  const scrollToAnalyzer = () => {
    analyzerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const tabs: { id: typeof inputType; label: string; icon: typeof FileText }[] = [
    { id: "text", label: "Texto o noticia", icon: FileText },
    { id: "url", label: "Enlace o URL", icon: Link },
    { id: "video", label: "Video (transcripción)", icon: Video },
  ];

  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <WelcomeSection onStart={scrollToAnalyzer} />

        <div ref={analyzerRef} id="verificar" className="factify-analyzer-anchor max-w-4xl mx-auto factify-enter factify-enter-d5">
          <h2 className="factify-section-heading">Verifica tu noticia ahora</h2>

        <div className="surface-panel surface-panel-accent overflow-hidden mb-8 factify-enter factify-enter-scale factify-enter-d6">
          <div className="factify-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setInputType(tab.id);
                  setError("");
                }}
                className={`factify-tab ${inputType === tab.id ? "factify-tab--active" : ""}`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.id === "text" ? "Texto" : tab.id === "url" ? "URL" : "Video"}</span>
              </button>
            ))}
          </div>

          <div className="p-6">
            {inputType === "url" ? (
              <div className="field-wrap">
                <Link className="field-icon" />
                <input
                  type="text"
                  value={currentInput}
                  onChange={(e) => updateCurrentInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  placeholder="https://ejemplo.com/noticia"
                  className="field field-with-icon"
                />
              </div>
            ) : (
              <textarea
                value={currentInput}
                onChange={(e) => updateCurrentInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  inputType === "video"
                    ? "Pega la transcripción del audio del video y, si puedes, agrega título o descripción..."
                    : "Pega aquí el texto de la noticia que deseas verificar... (Ctrl+Enter para analizar)"
                }
                className="field resize-none"
                rows={6}
              />
            )}

            {error && (
              <p className="mt-2 text-red-500 flex items-center gap-1.5" style={{ fontSize: "0.875rem" }}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-5 gap-4">
              <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.8rem", lineHeight: 1.5 }}>
                Factify consulta fuentes reales y entrega una clasificación basada en si respaldan o desmienten la afirmación.
              </p>
              <button onClick={handleAnalyze} disabled={loading} className="btn-primary flex-shrink-0">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Analizar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        </div>

        <div className="max-w-4xl mx-auto factify-enter factify-enter-d7">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 factify-stagger">
          {[
            {
              icon: FileText,
              iconColor: "text-blue-600 dark:text-blue-400",
              wrapClass: "bg-blue-50 dark:bg-blue-900/30",
              title: "Ingresa el contenido",
              desc: "Pega texto, titular o enlace de la noticia",
            },
            {
              icon: Search,
              iconColor: "text-indigo-600 dark:text-indigo-400",
              wrapClass: "bg-indigo-50 dark:bg-indigo-900/25",
              title: "Consulta fuentes",
              desc: "El sistema contrasta con medios y verificadores",
            },
            {
              icon: Shield,
              iconColor: "text-emerald-600 dark:text-emerald-400",
              wrapClass: "bg-emerald-50 dark:bg-emerald-900/25",
              title: "Resultado claro",
              desc: "Recibe clasificación y explicación educativa",
            },
          ].map((step, i) => (
            <div key={i} className="card-tonal p-5 flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${step.wrapClass}`}>
                <step.icon className={`w-5 h-5 ${step.iconColor}`} />
              </div>
              <div>
                <p className="text-gray-900 dark:text-gray-100" style={{ fontWeight: 600 }}>
                  {step.title}
                </p>
                <p className="text-gray-500 dark:text-gray-400 mt-0.5" style={{ fontSize: "0.875rem" }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="surface-panel p-5">
          <h3 className="text-gray-700 dark:text-gray-200 mb-4" style={{ fontWeight: 600 }}>
            Escala de clasificación
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                icon: CheckCircle,
                label: "Confiable",
                textClass: "text-green-700 dark:text-green-400",
                cardClass: "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800",
                desc: "Fuente identificable, coherencia con información disponible y baja presencia de señales de desinformación.",
              },
              {
                icon: AlertTriangle,
                label: "Dudoso",
                textClass: "text-amber-700 dark:text-amber-400",
                cardClass: "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800",
                desc: "Información incompleta, fuente poco clara, lenguaje alarmista o requiere verificación adicional.",
              },
              {
                icon: XCircle,
                label: "Falso",
                textClass: "text-red-700 dark:text-red-400",
                cardClass: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800",
                desc: "Contradicciones relevantes, señales fuertes de manipulación o ausencia total de respaldo verificable.",
              },
            ].map((item) => (
              <div key={item.label} className={`rounded-lg p-4 ${item.cardClass}`}>
                <div className="flex items-center gap-2 mb-2">
                  <item.icon className={`w-5 h-5 ${item.textClass}`} />
                  <span className={item.textClass} style={{ fontWeight: 600 }}>
                    {item.label}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.8rem", lineHeight: 1.5 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <button onClick={onNavigateTips} className="btn-ghost-soft inline-flex">
            Ver consejos para identificar noticias falsas
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
