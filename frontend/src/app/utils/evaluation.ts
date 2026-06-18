import type { Classification } from "./analyzer";
import type { EvaluationItem } from "../data/evaluationDataset";

export interface PredictionRecord {
  id: string;
  expected: Classification;
  predicted: Classification;
  correct: boolean;
}

export interface EvaluationMetrics {
  total: number;
  correct: number;
  accuracy: number; // 0-100, coincidencia exacta de las 3 clases
  /**
   * Detector binario de desinformación: "alerta" = dudoso o falso, "ok" = confiable.
   * Métricas clave para la confianza del usuario.
   */
  precision: number; // 0-100
  recall: number; // 0-100
  f1: number; // 0-100
  truePositives: number; // problemáticas detectadas como alerta
  trueNegatives: number; // confiables detectadas como confiable
  falsePositives: number; // confiables marcadas erróneamente como alerta
  falseNegatives: number; // problemáticas que pasaron como confiable (lo más grave)
  perClass: Record<Classification, { total: number; correct: number }>;
  records: PredictionRecord[];
}

const isAlert = (c: Classification): boolean => c === "dudoso" || c === "falso";

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

/**
 * Ejecuta el dataset etiquetado a través de `runner` (el motor real o el local)
 * y calcula las métricas de precisión. `onProgress` permite mostrar avance.
 */
export async function evaluateDataset(
  dataset: EvaluationItem[],
  runner: (text: string) => Promise<Classification>,
  onProgress?: (done: number, total: number) => void,
): Promise<EvaluationMetrics> {
  const records: PredictionRecord[] = [];
  const perClass: EvaluationMetrics["perClass"] = {
    confiable: { total: 0, correct: 0 },
    dudoso: { total: 0, correct: 0 },
    falso: { total: 0, correct: 0 },
  };

  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;

  for (let i = 0; i < dataset.length; i++) {
    const item = dataset[i];
    const predicted = await runner(item.text);
    const correct = predicted === item.expected;

    records.push({ id: item.id, expected: item.expected, predicted, correct });
    perClass[item.expected].total += 1;
    if (correct) perClass[item.expected].correct += 1;

    const expectedAlert = isAlert(item.expected);
    const predictedAlert = isAlert(predicted);
    if (expectedAlert && predictedAlert) tp += 1;
    else if (!expectedAlert && !predictedAlert) tn += 1;
    else if (!expectedAlert && predictedAlert) fp += 1;
    else fn += 1;

    onProgress?.(i + 1, dataset.length);
  }

  const correct = records.filter((r) => r.correct).length;
  const precision = pct(tp, tp + fp);
  const recall = pct(tp, tp + fn);
  const f1 = precision + recall > 0 ? Math.round((2 * precision * recall) / (precision + recall)) : 0;

  return {
    total: dataset.length,
    correct,
    accuracy: pct(correct, dataset.length),
    precision,
    recall,
    f1,
    truePositives: tp,
    trueNegatives: tn,
    falsePositives: fp,
    falseNegatives: fn,
    perClass,
    records,
  };
}
