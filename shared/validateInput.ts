export const MIN_TEXT_LENGTH = 20;
export const MAX_TEXT_LENGTH = 10_000;

export type InputKind = "text" | "url" | "video";

export interface ValidVerifyBody {
  text: string;
  kind: InputKind;
}

export interface ValidationError {
  status: number;
  error: string;
}

export function validateVerifyBody(body: unknown): ValidVerifyBody | ValidationError {
  if (body === null || typeof body !== "object") {
    return { status: 400, error: "El cuerpo de la solicitud debe ser JSON válido." };
  }

  const record = body as Record<string, unknown>;

  if (!("text" in record)) {
    return { status: 400, error: "Falta el campo obligatorio \"text\"." };
  }

  if (typeof record.text !== "string") {
    return { status: 400, error: "El campo \"text\" debe ser una cadena de texto." };
  }

  const text = record.text.trim();

  if (!text) {
    return { status: 400, error: "El texto no puede estar vacío." };
  }

  if (text.length < MIN_TEXT_LENGTH) {
    return {
      status: 400,
      error: `El texto debe contener al menos ${MIN_TEXT_LENGTH} caracteres.`,
    };
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return {
      status: 413,
      error: `El texto supera el máximo de ${MAX_TEXT_LENGTH} caracteres.`,
    };
  }

  const kindRaw = record.kind;
  const kind: InputKind =
    kindRaw === "url" || kindRaw === "video" ? kindRaw : "text";

  return { text, kind };
}
