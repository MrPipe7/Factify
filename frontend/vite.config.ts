import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

async function readJsonBody(req: any): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
}

function verifyApiDevServer(mode: string) {
  return {
    name: "factify-verify-api",
    configureServer(server: any) {
      const env = loadEnv(mode, rootDir, "");
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) process.env[key] = value as string;
      }

      server.middlewares.use("/api/verify", async (req: any, res: any) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }
        try {
          const body = await readJsonBody(req);
          const { validateVerifyBody } = await server.ssrLoadModule(
            path.resolve(rootDir, "shared/validateInput.ts"),
          );
          const validated = validateVerifyBody(body);
          if ("error" in validated) {
            res.statusCode = validated.status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: validated.error }));
            return;
          }

          const modPath = path.resolve(rootDir, "backend/src/verification.ts");
          const { runVerification } = await server.ssrLoadModule(modPath + `?v=${Date.now()}`);
          const result = await runVerification({ text: validated.text, kind: validated.kind });
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(result));
        } catch (error: any) {
          const message = error?.message ?? "verification_failed";
          res.statusCode = message.includes("al menos") ? 400 : 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: message }));
        }
      });

      server.middlewares.use("/api/evaluation", async (req: any, res: any) => {
        if (req.method !== "GET") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        const expected = process.env.FACTIFY_ADMIN_KEY ?? "PipeAdmin";
        const url = new URL(req.url ?? "/", "http://localhost");
        const provided = url.searchParams.get("key") ?? req.headers["x-factify-admin-key"];
        if (provided !== expected) {
          res.statusCode = 401;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Clave de administración inválida o ausente." }));
          return;
        }

        try {
          const modPath = path.resolve(rootDir, "backend/src/evaluation.ts");
          const { runEvaluationReport } = await server.ssrLoadModule(modPath + `?v=${Date.now()}`);
          const report = await runEvaluationReport();
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(report));
        } catch (error: any) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: error?.message ?? "evaluation_failed" }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  envDir: rootDir,
  plugins: [verifyApiDevServer(mode), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(rootDir, "shared"),
    },
  },
  assetsInclude: ["**/*.svg", "**/*.csv"],
}));
