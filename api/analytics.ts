import { recordEvent, queryAnalytics } from "../backend/src/analytics.js";

export default async function handler(req: any, res: any) {
  try {
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
      const result = await recordEvent(body);
      res.status(result.ok ? 201 : 500).json(result);
    } else if (req.method === "GET") {
      const result = await queryAnalytics();
      res.status(result.error ? 500 : 200).json(result);
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "analytics_failed" });
  }
}
