/**
 * Función serverless de verificación (compatible con Vercel).
 */

import { runVerification } from "../backend/src/verification.ts";
import { validateVerifyBody } from "../shared/validateInput.ts";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const validated = validateVerifyBody(body);
    if ("error" in validated) {
      res.status(validated.status).json({ error: validated.error });
      return;
    }

    const result = await runVerification({ text: validated.text, kind: validated.kind });
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).json(result);
  } catch (error: any) {
    const message = error?.message ?? "verification_failed";
    if (message.includes("al menos")) {
      res.status(400).json({ error: message });
      return;
    }
    res.status(500).json({ error: message });
  }
}
