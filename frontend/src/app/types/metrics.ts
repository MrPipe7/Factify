/** Tipos usados por MetricsPage (prototipo / presentacion). No expuestos en la app publica. */

export type InputKind = "text" | "url" | "video";

export interface AppMetrics {
  analysisAttempts: number;
  analysesCompleted: number;
  totalProcessingMs: number;
  alertsTriggered: number;
  shareCancelled: number;
  shareContinued: number;
  helpfulFeedback: number;
  notHelpfulFeedback: number;
  understoodCount: number;
  notUnderstoodCount: number;
  wouldShareCount: number;
  wouldNotShareCount: number;
  intentBeforeYes: number;
  intentBeforeNo: number;
  intentBeforeUnsure: number;
}

export const DEFAULT_METRICS: AppMetrics = {
  analysisAttempts: 0,
  analysesCompleted: 0,
  totalProcessingMs: 0,
  alertsTriggered: 0,
  shareCancelled: 0,
  shareContinued: 0,
  helpfulFeedback: 0,
  notHelpfulFeedback: 0,
  understoodCount: 0,
  notUnderstoodCount: 0,
  wouldShareCount: 0,
  wouldNotShareCount: 0,
  intentBeforeYes: 0,
  intentBeforeNo: 0,
  intentBeforeUnsure: 0,
};
