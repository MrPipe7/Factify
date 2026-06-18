/**
 * Evaluación reproducible del prototipo con data/evaluation_news.json (30 casos).
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Classification } from "../../shared/analyzer.ts";
import { repairUtf8Mojibake } from "../../shared/textEncoding.ts";
import { ANALYSIS_STRATEGY, FACTIFY_PROTOTYPE_VERSION } from "../../shared/version.ts";
import { runVerification, type VerificationPayload } from "./verification.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type ExpectedLabel = "Confiable" | "Dudosa" | "Falsa";

export interface EvaluationCase {
  id: number;
  title: string;
  text: string;
  expected_classification: ExpectedLabel;
  validation_source?: string;
  notes?: string;
}

export interface EvaluationCaseResult {
  id: number;
  title: string;
  expected_classification: ExpectedLabel;
  obtained_classification: Classification;
  expected_normalized: Classification;
  correct: boolean;
  confidence: number;
  response_time_ms: number;
  analysis_origin: string;
  engine: string;
  is_false_positive: boolean;
  is_false_negative: boolean;
}

export interface EvaluationReport {
  prototype_version: string;
  executed_at: string;
  analysis_strategy: string;
  external_verification_used: boolean;
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  false_positives: number;
  false_positive_rate: number;
  false_negatives: number;
  false_negative_rate: number;
  average_response_time_ms: number;
  confusion_matrix: Record<ExpectedLabel, Record<ExpectedLabel, number>>;
  results: EvaluationCaseResult[];
}

function resolveEvaluationFile(): string {
  const candidates = [
    resolve(__dirname, "../../data/evaluation_news.json"),
    resolve(process.cwd(), "data/evaluation_news.json"),
  ];
  for (const file of candidates) {
    if (existsSync(file)) return file;
  }
  throw new Error(
    `No se encontró data/evaluation_news.json (buscado en: ${candidates.join(", ")})`,
  );
}

function loadCases(): EvaluationCase[] {
  const raw = readFileSync(resolveEvaluationFile(), "utf-8").replace(/^\uFEFF/, "");
  const parsed = JSON.parse(raw) as EvaluationCase[];
  if (!Array.isArray(parsed) || parsed.length !== 30) {
    throw new Error(`Se esperaban 30 casos en evaluation_news.json, se encontraron ${parsed?.length ?? 0}.`);
  }
  return parsed.map((item) => ({
    ...item,
    title: repairUtf8Mojibake(item.title),
    text: repairUtf8Mojibake(item.text),
  }));
}

export function normalizeExpected(label: ExpectedLabel): Classification {
  if (label === "Confiable") return "confiable";
  if (label === "Dudosa") return "dudoso";
  return "falso";
}

function obtainedLabel(c: Classification): ExpectedLabel {
  if (c === "confiable") return "Confiable";
  if (c === "dudoso") return "Dudosa";
  return "Falsa";
}

function pct(n: number, d: number): number {
  if (d <= 0) return 0;
  return Math.round((n / d) * 100);
}

function emptyMatrix(): Record<ExpectedLabel, Record<ExpectedLabel, number>> {
  return {
    Confiable: { Confiable: 0, Dudosa: 0, Falsa: 0 },
    Dudosa: { Confiable: 0, Dudosa: 0, Falsa: 0 },
    Falsa: { Confiable: 0, Dudosa: 0, Falsa: 0 },
  };
}

function isFalsePositive(expected: ExpectedLabel, obtained: Classification): boolean {
  return expected === "Confiable" && (obtained === "dudoso" || obtained === "falso");
}

function isFalseNegative(expected: ExpectedLabel, obtained: Classification): boolean {
  return (expected === "Dudosa" || expected === "Falsa") && obtained === "confiable";
}

export async function runEvaluationReport(): Promise<EvaluationReport> {
  const cases = loadCases();
  const matrix = emptyMatrix();
  const results: EvaluationCaseResult[] = [];
  let falsePositives = 0;
  let falseNegatives = 0;
  let totalMs = 0;
  let usedExternal = false;

  for (const item of cases) {
    const started = Date.now();
    const payload: VerificationPayload = await runVerification({
      text: item.text,
      kind: "text",
      skipCache: true,
      skipExternal: true,
    });
    const elapsed = Date.now() - started;
    totalMs += elapsed;

    if ((payload.providers?.length ?? 0) > 0) usedExternal = true;

    const expectedNorm = normalizeExpected(item.expected_classification);
    const obtained = payload.classification;
    const correct = expectedNorm === obtained;
    const obtainedLabelStr = obtainedLabel(obtained);

    matrix[item.expected_classification][obtainedLabelStr] += 1;

    const fp = isFalsePositive(item.expected_classification, obtained);
    const fn = isFalseNegative(item.expected_classification, obtained);
    if (fp) falsePositives += 1;
    if (fn) falseNegatives += 1;

    results.push({
      id: item.id,
      title: item.title,
      expected_classification: item.expected_classification,
      obtained_classification: obtained,
      expected_normalized: expectedNorm,
      correct,
      confidence: payload.confidence,
      response_time_ms: elapsed,
      analysis_origin: payload.analysisOrigin,
      engine: payload.engine,
      is_false_positive: fp,
      is_false_negative: fn,
    });
  }

  const correct = results.filter((r) => r.correct).length;
  const confiableExpected = cases.filter((c) => c.expected_classification === "Confiable").length;
  const riskyExpected = cases.filter((c) => c.expected_classification !== "Confiable").length;

  return {
    prototype_version: FACTIFY_PROTOTYPE_VERSION,
    executed_at: new Date().toISOString(),
    analysis_strategy: ANALYSIS_STRATEGY,
    external_verification_used: usedExternal,
    total: cases.length,
    correct,
    incorrect: cases.length - correct,
    accuracy: pct(correct, cases.length),
    false_positives: falsePositives,
    false_positive_rate: pct(falsePositives, confiableExpected),
    false_negatives: falseNegatives,
    false_negative_rate: pct(falseNegatives, riskyExpected),
    average_response_time_ms: Math.round(totalMs / cases.length),
    confusion_matrix: matrix,
    results,
  };
}
