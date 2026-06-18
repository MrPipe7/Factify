import { AlertTriangle, X, ExternalLink } from "../../components/Icons";
import { Classification } from "../utils/analyzer";

interface AlertModalProps {
  classification: Classification;
  onClose: () => void;
  onContinue: () => void;
}

export function AlertModal({ classification, onClose, onContinue }: AlertModalProps) {
  const isFalse = classification === "falso";
  const tintBoxClass = isFalse
    ? "bg-red-50 border border-red-200"
    : "bg-amber-50 border border-amber-200";
  const accentTextClass = isFalse ? "text-red-700" : "text-amber-700";
  const iconWrapClass = isFalse ? "bg-red-50" : "bg-amber-50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative surface-panel surface-panel-accent rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-modal">
        <div
          className="h-0.5"
          style={{ background: isFalse ? "#dc2626" : "#d97706" }}
        />

        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon */}
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${iconWrapClass}`}>
            <AlertTriangle className={`w-8 h-8 ${accentTextClass}`} />
          </div>

          <h2 className="text-gray-900 mb-2" style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            Advertencia antes de compartir
          </h2>
          <p className="text-gray-600 mb-4" style={{ fontSize: "0.925rem", lineHeight: 1.6 }}>
            {isFalse
              ? "Este contenido fue clasificado como probablemente falso. Compartirlo puede contribuir a la desinformación y afectar a otras personas."
              : "Este contenido fue clasificado como dudoso y requiere verificación adicional. Compartirlo sin verificar puede difundir información incorrecta."}
          </p>

          <div className={`rounded-xl p-4 mb-5 ${tintBoxClass}`}>
            <p className={`mb-2 ${accentTextClass}`} style={{ fontSize: "0.875rem", fontWeight: 600 }}>
              Antes de compartir, te recomendamos:
            </p>
            <ul className="flex flex-col gap-1.5">
              {[
                "Verificar la información en al menos dos fuentes confiables",
                "Contrastar la información con medios reconocidos y fuentes oficiales",
                "Buscar el artículo original o la fuente primaria",
                "Preguntar: ¿esta noticia tiene autor, fecha y fuente identificable?",
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: isFalse ? "#dc2626" : "#d97706" }}
                  />
                  <span className={accentTextClass} style={{ fontSize: "0.825rem", lineHeight: 1.5 }}>
                    {tip}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={onClose}
              className={`w-full justify-center ${isFalse ? "btn-accent-warn" : "btn-accent-warn"}`}
              style={!isFalse ? { background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" } : undefined}
            >
              Entendido, no compartiré
            </button>
            <button onClick={onContinue} className="btn-ghost w-full justify-center py-3">
              <ExternalLink className="w-4 h-4" />
              Continuar de todas formas
            </button>
          </div>

          <p className="text-center text-gray-400 mt-4" style={{ fontSize: "0.75rem" }}>
            Factify promueve el consumo responsable de información
          </p>
        </div>
      </div>
    </div>
  );
}
