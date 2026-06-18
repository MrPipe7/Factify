import { History, CheckCircle, AlertTriangle, XCircle, Trash2, BarChart3, RefreshCw } from "../../components/Icons";
import { AnalysisResult, Classification } from "../utils/analyzer";

interface HistoryPageProps {
  history: AnalysisResult[];
  onSelectResult: (result: AnalysisResult) => void;
  onClearHistory: () => void;
  onAnalyzeNew: () => void;
}

const classificationConfig = {
  confiable: {
    icon: CheckCircle,
    label: "Confiable",
    textClass: "text-green-700",
    cardClass: "bg-green-50 border-green-200",
    iconWrapClass: "bg-green-100",
    badgeClass: "bg-green-100 text-green-700 border border-green-200",
  },
  dudoso: {
    icon: AlertTriangle,
    label: "Dudoso",
    textClass: "text-amber-700",
    cardClass: "bg-amber-50 border-amber-200",
    iconWrapClass: "bg-amber-100",
    badgeClass: "bg-amber-100 text-amber-700 border border-amber-200",
  },
  falso: {
    icon: XCircle,
    label: "Probablemente falso",
    textClass: "text-red-700",
    cardClass: "bg-red-50 border-red-200",
    iconWrapClass: "bg-red-100",
    badgeClass: "bg-red-100 text-red-700 border border-red-200",
  },
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function HistoryPage({ history, onSelectResult, onClearHistory, onAnalyzeNew }: HistoryPageProps) {
  const counts = {
    confiable: history.filter((r) => r.classification === "confiable").length,
    dudoso: history.filter((r) => r.classification === "dudoso").length,
    falso: history.filter((r) => r.classification === "falso").length,
  };

  if (history.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="text-center mb-8">
            <h1 className="text-gray-900 mb-2" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
              Historial de análisis
            </h1>
            <p className="text-gray-500">Aquí aparecerán los análisis que hayas realizado en esta sesión.</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <History className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-gray-700 mb-2" style={{ fontWeight: 600 }}>Sin análisis realizados</h3>
            <p className="text-gray-400 mb-6" style={{ fontSize: "0.9rem" }}>
              Aún no has analizado ninguna noticia en esta sesión.
            </p>
            <button
              onClick={onAnalyzeNew}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white transition-all"
              style={{ background: "linear-gradient(135deg, #1e4f9c, #3b82f6)" }}
            >
              <RefreshCw className="w-4 h-4" />
              Analizar una noticia
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-gray-900 mb-1" style={{ fontSize: "1.75rem", fontWeight: 700 }}>
              Historial de análisis
            </h1>
            <p className="text-gray-500" style={{ fontSize: "0.9rem" }}>
              {history.length} análisis realizados en esta sesión
            </p>
          </div>
          <button
            onClick={onClearHistory}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 transition-all"
            style={{ fontSize: "0.875rem" }}
          >
            <Trash2 className="w-4 h-4" />
            Limpiar historial
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {(["confiable", "dudoso", "falso"] as Classification[]).map((cls) => {
            const cfg = classificationConfig[cls];
            const Icon = cfg.icon;
            return (
              <div key={cls} className={`rounded-xl p-4 border ${cfg.cardClass}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${cfg.textClass}`} />
                  <span className={cfg.textClass} style={{ fontSize: "0.8rem", fontWeight: 600 }}>{cfg.label}</span>
                </div>
                <p className={cfg.textClass} style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1 }}>
                  {counts[cls]}
                </p>
              </div>
            );
          })}
        </div>

        {/* History list */}
        <div className="flex flex-col gap-3">
          {[...history].reverse().map((result, i) => {
            const cfg = classificationConfig[result.classification];
            const Icon = cfg.icon;
            return (
              <button
                key={i}
                onClick={() => onSelectResult(result)}
                className="bg-white rounded-xl border border-gray-100 p-4 text-left shadow-sm hover:shadow-md hover:border-gray-200 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.iconWrapClass}`}>
                    <Icon className={`w-5 h-5 ${cfg.textClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full ${cfg.badgeClass}`}
                        style={{ fontSize: "0.75rem", fontWeight: 600 }}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-gray-400" style={{ fontSize: "0.78rem" }}>
                        {formatDate(result.timestamp)}
                      </span>
                      <span className="text-gray-400" style={{ fontSize: "0.78rem" }}>
                        Confianza: {result.confidence}%
                      </span>
                    </div>
                    <p className="text-gray-700 truncate" style={{ fontSize: "0.875rem" }}>
                      {result.inputText}
                    </p>
                    <p className="text-gray-400 mt-0.5" style={{ fontSize: "0.8rem" }}>
                      {result.signals.length} señal{result.signals.length !== 1 ? "es" : ""} detectada{result.signals.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <BarChart3 className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
