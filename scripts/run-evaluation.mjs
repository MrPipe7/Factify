/**
 * Ejecuta evaluación local de 30 casos (sin servidor).
 * Uso: npx tsx scripts/run-evaluation.mjs
 */
import { runEvaluationReport } from "../backend/src/evaluation.ts";

const r = await runEvaluationReport();
console.log(`Accuracy: ${r.accuracy}% (${r.correct}/${r.total})`);
console.log(`FP: ${r.false_positives} (${r.false_positive_rate}%) FN: ${r.false_negatives} (${r.false_negative_rate}%)`);
console.log(JSON.stringify(r.confusion_matrix, null, 2));
const wrong = r.results.filter((x) => !x.correct);
if (wrong.length) {
  console.log("Incorrect cases:");
  for (const w of wrong) {
    console.log(`  #${w.id} ${w.expected_classification} -> ${w.obtained_classification}: ${w.title}`);
  }
}
