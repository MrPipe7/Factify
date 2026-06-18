import { analyzeContent, type AnalysisResult, type SourceStats } from "./analyzer";

type InputKind = "text" | "url" | "video";

interface VerifyApiResponse {
  classification: AnalysisResult["classification"];
  confidence: number;
  signals: AnalysisResult["signals"];
  explanation: string;
  recommendation: string;
  engine: AnalysisResult["engine"];
  analysisOrigin?: AnalysisResult["analysisOrigin"];
  preliminaryLocal?: boolean;
  sources: AnalysisResult["sources"];
  inputText: string;
  sourceStats?: SourceStats;
  fromCache?: boolean;
  error?: string;
}

/**
 * Verifica el contenido usando el motor del servidor (Fact Check + fuentes + IA).
 * Si el endpoint no está disponible o falla, cae con elegancia a la heurística
 * local para que la app siga funcionando sin conexión ni claves.
 */
export async function verifyContent(text: string, kind: InputKind): Promise<AnalysisResult> {
  try {
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, kind }),
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(errBody.error ?? `verify_failed_${res.status}`);
    }

    const data = (await res.json()) as VerifyApiResponse;
    if (data.error) throw new Error(data.error);

    return {
      classification: data.classification,
      confidence: data.confidence,
      signals: data.signals ?? [],
      explanation: data.explanation,
      recommendation: data.recommendation,
      engine: data.engine ?? "local",
      analysisOrigin: data.analysisOrigin,
      preliminaryLocal: data.preliminaryLocal,
      sources: data.sources ?? [],
      sourceStats: data.sourceStats,
      fromCache: data.fromCache,
      timestamp: new Date(),
      inputText: data.inputText ?? text,
    };
  } catch (err) {
    const local = analyzeContent(text);
    const message = err instanceof Error ? err.message : "verify_unavailable";
    return {
      ...local,
      engine: "local",
      sources: [],
      analysisOrigin: "Análisis textual local",
      preliminaryLocal: true,
      signals: [
        ...local.signals,
        {
          type: "warning",
          label: "Verificación externa no disponible",
          description:
            message.includes("verify_failed_404") || message.includes("404")
              ? "No se encontró /api/verify en el servidor. Revisa el despliegue en Vercel y vuelve a desplegar."
              : message.includes("verify_failed_5")
                ? "El servidor respondió con error. Revisa variables de entorno en Vercel (GOOGLE_FACTCHECK_API_KEY, TAVILY_API_KEY) y los logs de Functions."
                : "No se pudo usar el motor del servidor. Se muestra solo el análisis local.",
        },
      ],
    };
  }
}
