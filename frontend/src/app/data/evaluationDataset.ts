import type { Classification } from "../utils/analyzer";

export interface EvaluationItem {
  id: string;
  text: string;
  expected: Classification;
}

/**
 * Conjunto de noticias pre-clasificadas para medir la precisión del motor.
 * Sirve como evidencia de validación del prototipo. Puedes ampliarlo hasta
 * las 30 noticias del informe agregando más entradas aquí.
 */
export const EVALUATION_DATASET: EvaluationItem[] = [
  {
    id: "c1",
    expected: "confiable",
    text: "Según un estudio publicado en la revista Science, investigadores de la Universidad de Chile confirmaron una reducción del 30% en casos de dengue tras implementar nuevos protocolos sanitarios. El Ministerio de Salud informó que el programa se ampliará a todo el país.",
  },
  {
    id: "c2",
    expected: "confiable",
    text: "El Banco Central informó que la inflación de mayo fue de 0,3%, según el reporte mensual publicado en su sitio oficial. Economistas consultados por medios reconocidos coincidieron en que la cifra estuvo dentro de lo esperado.",
  },
  {
    id: "c3",
    expected: "confiable",
    text: "De acuerdo con la Organización Mundial de la Salud, la cobertura de vacunación infantil aumentó este año. El informe, elaborado con datos de los ministerios de salud, fue reportado por agencias como Reuters y EFE.",
  },
  {
    id: "c4",
    expected: "confiable",
    text: "Investigadores de la NASA publicaron en un artículo revisado por pares nuevas mediciones sobre la temperatura oceánica. El estudio, disponible en el journal correspondiente, fue cubierto por la BBC.",
  },
  {
    id: "c5",
    expected: "confiable",
    text: "El Instituto Nacional de Estadísticas reportó que la tasa de desempleo bajó al 7,8% en el último trimestre, según datos oficiales difundidos esta semana y comentados por expertos universitarios.",
  },
  {
    id: "d1",
    expected: "dudoso",
    text: "Dicen que una nueva fruta podría curar varias enfermedades, aunque no se mencionan estudios concretos ni instituciones que lo respalden. Circula en redes y muchos lo comparten.",
  },
  {
    id: "d2",
    expected: "dudoso",
    text: "Un sitio asegura que cierto alimento común sería peligroso para la salud, pero el artículo no cita fuentes claras ni autor, y la fecha no aparece visible.",
  },
  {
    id: "d3",
    expected: "dudoso",
    text: "Se rumorea que una empresa lanzaría un producto revolucionario el próximo mes. La información proviene de una sola cuenta y no hay confirmación oficial.",
  },
  {
    id: "d4",
    expected: "dudoso",
    text: "Un mensaje afirma que habría cambios importantes en un trámite público, aunque no enlaza ningún comunicado oficial ni medio reconocido que lo confirme.",
  },
  {
    id: "d5",
    expected: "dudoso",
    text: "Según un amigo me dijo, pronto subirían los precios de varios servicios. No se indica fuente ni documento que respalde la afirmación.",
  },
  {
    id: "f1",
    expected: "falso",
    text: "¡URGENTE! El gobierno está OCULTANDO la verdad sobre las vacunas. Todo el mundo sabe que la élite no quiere que sepas esto. ¡¡COMPARTE ANTES DE QUE LO BORREN!! La información está siendo censurada.",
  },
  {
    id: "f2",
    expected: "falso",
    text: "EL GRAN SECRETO QUE LOS PODEROSOS NO QUIEREN QUE SEPAS. Sin fuentes pero IMPACTANTE. La verdad oculta que te están silenciando. ¡INCREÍBLE! Comparte antes de que lo eliminen.",
  },
  {
    id: "f3",
    expected: "falso",
    text: "ALERTA: un nuevo orden mundial controla los medios y te ocultan la cura definitiva. Me llegó por WhatsApp y todos lo saben. ¡¡¡Difunde URGENTE antes de que lo borren!!!",
  },
  {
    id: "f4",
    expected: "falso",
    text: "ATENCIÓN: descubren remedio milagroso que la big pharma prohíbe. Sin autor ni fecha, pero es CONFIRMADO. No quieren que lo sepas. ¡COMPARTE YA!",
  },
  {
    id: "f5",
    expected: "falso",
    text: "INCREÍBLE y EXCLUSIVO: revelan complot secreto que el gobierno oculta. La verdad que ocultan los poderosos. ¡¡IMPACTANTE!! Comparte antes de que lo censuren.",
  },
];
