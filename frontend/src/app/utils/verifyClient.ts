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
  } catch {
    const local = analyzeContent(text);
    return { ...local, engine: "local", sources: [] };
  }
}
