/**
 * Batería de pruebas del prototipo Factify.
 * Requiere: npm run dev (frontend en http://localhost:5173)
 *
 * Uso: node scripts/test-prototype.mjs
 *      node scripts/test-prototype.mjs --base http://localhost:5174
 */

const BASE = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://localhost:5173";

const API = `${BASE.replace(/\/$/, "")}/api/verify`;

const CASES = [
  { id: "iphone-miami", text: "iphone 15 explota en miami", expect: /falso|dudoso/ },
  { id: "argentina-corta", text: "Argentina gana a Francia, final Qatar 2022", expect: /confiable|dudoso/ },
  { id: "argentina-larga", text: "argentina gana a francia en final del mundo qatar 2022", expect: /confiable|dudoso/ },
  { id: "messi-hattrick", text: "messi hace un hat trick vs argelia", expect: /confiable/ },
  { id: "portugal-congo", text: "portugal empata 1-1 contra el congo", expect: /confiable/ },
  { id: "5g-coronavirus", text: "El 5G propaga el coronavirus segun expertos.", expect: /falso|dudoso/ },
  { id: "grafeno-vacunas", text: "Las vacunas contra el covid-19 contienen oxido de grafeno para controlar a las personas.", expect: /falso/ },
  { id: "oms-manos", text: "La Organizacion Mundial de la Salud recomienda lavarse las manos con frecuencia para prevenir enfermedades infecciosas.", expect: /confiable|dudoso/ },
  { id: "torre-eiffel", text: "La Torre Eiffel se ilumino con la bandera de Argentina tras ganar el mundial", expect: /falso|dudoso/ },
  { id: "conspiracion", text: "EL GRAN SECRETO QUE LA ELITE NO QUIERE QUE SEPAS. Todo el mundo sabe que los poderosos controlan los medios.", expect: /dudoso|falso/ },
];

async function verify(text, kind = "text") {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, kind }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function assertShape(body, id) {
  const required = ["classification", "confidence", "explanation", "recommendation", "inputText"];
  for (const key of required) {
    if (body[key] === undefined) throw new Error(`${id}: falta campo "${key}"`);
  }
  if (!["confiable", "dudoso", "falso"].includes(body.classification)) {
    throw new Error(`${id}: classification inválida "${body.classification}"`);
  }
  if (typeof body.confidence !== "number" || body.confidence < 0 || body.confidence > 100) {
    throw new Error(`${id}: confidence fuera de rango`);
  }
}

async function run() {
  console.log(`\nFactify — pruebas del prototipo`);
  console.log(`API: ${API}\n`);

  const results = [];
  let passed = 0;
  let failed = 0;

  // 1) Conectividad
  try {
    const { status, body } = await verify("Prueba de conectividad Factify con texto suficiente para analizar.");
    if (status !== 200) throw new Error(`HTTP ${status}`);
    if (body.error) throw new Error(body.error);
    assertShape(body, "connectivity");
    results.push({ id: "connectivity", ok: true, detail: `${body.classification} ${body.confidence}%` });
    passed++;
  } catch (e) {
    results.push({ id: "connectivity", ok: false, detail: e.message });
    failed++;
    console.error("ERROR: servidor no disponible. Ejecuta: npm run dev\n");
    printSummary(results, passed, failed);
    process.exit(1);
  }

  // 2) Caché Supabase
  const cacheText = `Prueba cache ${Date.now()} texto unico para verificacion Factify`;
  try {
    const first = await verify(cacheText);
    const second = await verify(cacheText);
    if (first.body.fromCache === true) throw new Error("1ra llamada no debería venir de caché");
    if (second.body.fromCache !== true) throw new Error("2da llamada debería venir de caché (revisa Supabase/.env)");
    if (first.body.classification !== second.body.classification) {
      throw new Error("clasificación distinta entre cache miss/hit");
    }
    results.push({ id: "supabase-cache", ok: true, detail: "miss → hit OK" });
    passed++;
  } catch (e) {
    results.push({ id: "supabase-cache", ok: false, detail: e.message });
    failed++;
  }

  // 3) Casos de clasificación
  for (const c of CASES) {
    try {
      const { status, body } = await verify(c.text);
      if (status !== 200 || body.error) throw new Error(body.error ?? `HTTP ${status}`);
      assertShape(body, c.id);
      if (!c.expect.test(body.classification)) {
        throw new Error(`esperado ${c.expect}, obtuvo ${body.classification} (${body.confidence}%)`);
      }
      const src = (body.sources ?? []).length;
      const prov = (body.providers ?? []).join("+") || "local";
      results.push({
        id: c.id,
        ok: true,
        detail: `${body.classification} ${body.confidence}% · ${prov} · ${src} fuentes`,
      });
      passed++;
    } catch (e) {
      results.push({ id: c.id, ok: false, detail: e.message });
      failed++;
    }
  }

  // 4) Tipos de entrada (url / video)
  for (const kind of ["url", "video"]) {
    const text =
      kind === "url"
        ? "https://ejemplo.com/noticia-falsa-urgente-comparte-antes-de-que-borren"
        : "Transcripcion de video viral diciendo que el gobierno oculta la verdad sobre las vacunas segun expertos.";
    try {
      const { status, body } = await verify(text, kind);
      if (status !== 200 || body.error) throw new Error(body.error ?? `HTTP ${status}`);
      assertShape(body, kind);
      results.push({ id: `input-${kind}`, ok: true, detail: `${body.classification} ${body.confidence}%` });
      passed++;
    } catch (e) {
      results.push({ id: `input-${kind}`, ok: false, detail: e.message });
      failed++;
    }
  }

  printSummary(results, passed, failed);
  process.exit(failed > 0 ? 1 : 0);
}

function printSummary(results, passed, failed) {
  console.log("─".repeat(72));
  for (const r of results) {
    const mark = r.ok ? "OK  " : "FAIL";
    console.log(`${mark}  ${r.id.padEnd(20)} ${r.detail}`);
  }
  console.log("─".repeat(72));
  console.log(`Total: ${passed}/${passed + failed} pruebas OK\n`);
  if (failed === 0) {
    console.log("Prototipo listo para Vercel o pulido de frontend.");
  } else {
    console.log("Revisa los FAIL antes de desplegar.");
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
