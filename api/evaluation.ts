/**
 * GET /api/evaluation — evaluación reproducible de 30 casos (panel técnico).
 */

import { runEvaluationReport } from "../backend/src/evaluation";

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function isAuthorized(req: any): boolean {
  const expected = env("FACTIFY_ADMIN_KEY") ?? "PipeAdmin";
  const headerKey = req.headers?.["x-factify-admin-key"] ?? req.headers?.["X-Factify-Admin-Key"];
  const queryKey = typeof req.query?.key === "string" ? req.query.key : undefined;
  const provided = headerKey ?? queryKey;
  return provided === expected;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!isAuthorized(req)) {
    res.status(401).json({ error: "Clave de administración inválida o ausente." });
    return;
  }

  try {
    const report = await runEvaluationReport();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).json(report);
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "evaluation_failed" });
  }
}
