/**
 * Pruebas de requisitos (RF/HU) del prototipo Factify.
 * Requiere: npm run dev
 */
const BASE = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://localhost:5173";

const API_VERIFY = `${BASE.replace(/\/$/, "")}/api/verify`;
const API_EVAL = `${BASE.replace(/\/$/, "")}/api/evaluation`;
const ADMIN_KEY = process.env.FACTIFY_ADMIN_KEY ?? "PipeAdmin";

async function postVerify(body) {
  const res = await fetch(API_VERIFY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function ok(id, detail) {
  console.log(`OK   ${id.padEnd(28)} ${detail}`);
  return true;
}

function fail(id, detail) {
  console.log(`FAIL ${id.padEnd(28)} ${detail}`);
  return false;
}

async function run() {
  console.log("\nFactify — pruebas de requisitos\n");
  let passed = 0;
  let failed = 0;

  const track = (id, cond, detail) => {
    if (cond) {
      passed++;
      ok(id, detail);
    } else {
      failed++;
      fail(id, detail);
    }
  };

  // RF01 / HU01 — ingreso correcto
  {
    const text =
      "El Ministerio de Salud publicó el calendario de vacunación con fechas y centros habilitados para este año.";
    const { status, data } = await postVerify({ text, kind: "text" });
    track(
      "RF01 ingreso texto",
      status === 200 && data.classification && data.analysisOrigin,
      `${data.classification} · ${data.analysisOrigin ?? "sin origen"}`,
    );
  }

  // RF02 — validaciones backend
  {
    const empty = await postVerify({ text: "   " });
    track("RF02 texto vacío", empty.status === 400, `HTTP ${empty.status}`);

    const short = await postVerify({ text: "texto corto" });
    track("RF02 texto corto", short.status === 400, short.data.error ?? `HTTP ${short.status}`);

    const missing = await postVerify({});
    track("RF02 campo ausente", missing.status === 400, missing.data.error ?? `HTTP ${missing.status}`);

    const badType = await postVerify({ text: 12345 });
    track("RF02 tipo incorrecto", badType.status === 400, badType.data.error ?? `HTTP ${badType.status}`);
  }

  // RF04 / HU02 — procesamiento NLP + origen
  {
    const { status, data } = await postVerify({
      text: "Según Reuters, el Banco Central publicó cifras de inflación verificables este mes en su informe oficial.",
    });
    track(
      "RF04 analizador NLP",
      status === 200 && Array.isArray(data.signals) && data.signals.length > 0,
      `${data.signals?.length ?? 0} señales`,
    );
  }

  // RF05 — detección señales desinformación
  {
    const { data } = await postVerify({
      text: "¡URGENTE! Comparte antes de que lo borren. Todo el mundo sabe que la élite oculta la verdad sobre las vacunas y los científicos están censurados.",
    });
    const hasNegative = (data.signals ?? []).some((s) => s.type === "negative" || s.type === "warning");
    track("RF05 señales riesgo", hasNegative, hasNegative ? "señales detectadas" : "sin señales");
  }

  // RF06 / HU03 — clasificación válida
  {
    const { data } = await postVerify({
      text: "La Organización Mundial de la Salud recomienda lavarse las manos con frecuencia para prevenir enfermedades infecciosas según sus guías.",
    });
    track(
      "RF06 clasificación",
      ["confiable", "dudoso", "falso"].includes(data.classification),
      data.classification,
    );
  }

  // RF07 / HU04 — explicación
  {
    const { data } = await postVerify({
      text: "Un estudio preliminar menciona resultados positivos pero no identifica autores ni metodología completa del experimento realizado.",
    });
    track("RF07 explicación", typeof data.explanation === "string" && data.explanation.length > 20, "ok");
  }

  // RF08 / HU05 — alerta (dudoso/falso en API)
  {
    const { data } = await postVerify({
      text: "Circula un rumor sin fuente oficial sobre cambios escolares que podrían aplicarse el próximo mes sin confirmación verificable todavía.",
    });
    track(
      "RF08 alerta preventiva",
      data.classification === "dudoso" || data.classification === "falso",
      data.classification,
    );
  }

  // Regla: alarmista sin evidencia externa no debe ser falso solo local
  {
    const { data } = await postVerify({
      text: "EL GRAN SECRETO QUE LA ELITE NO QUIERE QUE SEPAS. Todo el mundo sabe que los poderosos controlan los medios y censuran la verdad oculta.",
    });
    const onlyStyle =
      data.classification !== "falso" ||
      (data.providers?.length > 0 && data.engine === "factcheck");
    track(
      "Regla no-falso-solo-estilo",
      onlyStyle || data.analysisOrigin?.includes("externa"),
      `${data.classification} · ${data.analysisOrigin ?? data.engine}`,
    );
  }

  // RF09 — evaluación 30 casos
  {
    const res = await fetch(`${API_EVAL}?key=${encodeURIComponent(ADMIN_KEY)}`);
    const data = await res.json().catch(() => ({}));
    const matrixOk =
      data.confusion_matrix?.Confiable &&
      data.confusion_matrix?.Dudosa &&
      data.confusion_matrix?.Falsa;
    track(
      "RF09 evaluación 30 casos",
      res.status === 200 && data.total === 30 && matrixOk,
      data.total === 30
        ? `accuracy ${data.accuracy}% · FP ${data.false_positives} · FN ${data.false_negatives}`
        : data.error ?? `HTTP ${res.status}`,
    );

    if (res.status === 200 && data.total === 30) {
      const sum = Object.values(data.confusion_matrix).reduce(
        (acc, row) => acc + Object.values(row).reduce((a, b) => a + b, 0),
        0,
      );
      track("Matriz suma 30", sum === 30, `suma=${sum}`);
      track(
        "Porcentajes calculados",
        typeof data.accuracy === "number" &&
          data.correct + data.incorrect === 30 &&
          data.accuracy === Math.round((data.correct / 30) * 100),
        `${data.correct}/${30} = ${data.accuracy}%`,
      );
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log(`Total: ${passed}/${passed + failed} pruebas OK\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
