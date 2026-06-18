/**
 * Repara texto UTF-8 mal interpretado como Latin-1 (ej. vacunaciÃ³n → vacunación).
 */
export function repairUtf8Mojibake(text: string): string {
  if (!/[ÃÂ][\u0080-\u00BF]/.test(text) && !text.includes("Ã")) return text;
  try {
    const repaired = Buffer.from(text, "latin1").toString("utf8");
    if (repaired.includes("\uFFFD")) return text;
    return repaired;
  } catch {
    return text;
  }
}
