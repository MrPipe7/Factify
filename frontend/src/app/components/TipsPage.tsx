import { BookOpen, Search, Globe, UserCheck, Clock, Hash, AlertTriangle, CheckCircle, Eye, Share2 } from "../../components/Icons";

export function TipsPage() {
  const tips = [
    {
      icon: Search,
      iconClass: "text-blue-600",
      wrapClass: "bg-blue-50",
      title: "Verifica la fuente",
      desc: "Antes de creer o compartir, pregúntate: ¿de dónde viene esta información? Busca el medio o sitio web que publicó la noticia y comprueba si es reconocido y confiable.",
      steps: [
        "Busca el nombre del medio en Google",
        "Revisa si tiene sección 'Acerca de'",
        "Verifica si aparece en directorios de prensa reconocidos",
      ],
    },
    {
      icon: Clock,
      iconClass: "text-purple-600",
      wrapClass: "bg-purple-50",
      title: "Revisa la fecha",
      desc: "Las noticias antiguas pueden ser compartidas como si fueran recientes para causar alarma. Verifica siempre cuándo fue publicada la noticia.",
      steps: [
        "Busca la fecha de publicación en el artículo",
        "Desconfía si no tiene fecha visible",
        "Contrasta con eventos actuales",
      ],
    },
    {
      icon: UserCheck,
      iconClass: "text-emerald-600",
      wrapClass: "bg-emerald-50",
      title: "Identifica al autor",
      desc: "Un artículo confiable generalmente tiene un autor identificable con credenciales. La ausencia de autoría es una señal de alerta.",
      steps: [
        "Busca el nombre del autor en el artículo",
        "Verifica su perfil profesional",
        "Desconfía de fuentes anónimas",
      ],
    },
    {
      icon: Globe,
      iconClass: "text-red-600",
      wrapClass: "bg-red-50",
      title: "Contrasta con otras fuentes",
      desc: "Si una noticia importante solo aparece en un único medio o red social, desconfía. Las noticias relevantes son cubiertas por múltiples medios.",
      steps: [
        "Busca la noticia en Google News",
        "Verifica en al menos 2-3 medios reconocidos",
        "Compara los hechos reportados",
      ],
    },
    {
      icon: Eye,
      iconClass: "text-amber-600",
      wrapClass: "bg-amber-50",
      title: "Lee más allá del titular",
      desc: "Los titulares engañosos (clickbait) están diseñados para captar la atención y pueden no reflejar el contenido real. Siempre lee el artículo completo.",
      steps: [
        "Lee el artículo completo, no solo el título",
        "Verifica que el contenido coincide con el titular",
        "Desconfía de titulares excesivamente impactantes",
      ],
    },
    {
      icon: Hash,
      iconClass: "text-cyan-600",
      wrapClass: "bg-cyan-50",
      title: "Analiza las imágenes y videos",
      desc: "Las imágenes pueden ser sacadas de contexto o manipuladas. Realiza una búsqueda inversa de imágenes para verificar su origen.",
      steps: [
        "Usa Google Imágenes o TinEye para búsqueda inversa",
        "Verifica el contexto original de la imagen",
        "Sé escéptico ante imágenes muy impactantes",
      ],
    },
  ];

  const redFlags = [
    "Títulos con exclamaciones o mayúsculas excesivas",
    "Frases como 'comparte antes de que lo borren'",
    "Ausencia de autor, fecha o fuente verificable",
    "Lenguaje muy emocional o alarmista",
    "La noticia solo aparece en redes sociales o blogs anónimos",
    "Imágenes o videos sin contexto verificable",
    "Frases como 'lo que el gobierno oculta'",
    "Estadísticas sin fuente o respaldo",
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full mb-5 border border-blue-100">
            <BookOpen className="w-4 h-4" />
            <span style={{ fontSize: "0.875rem" }}>Educación digital</span>
          </div>
          <h1 className="text-gray-900 mb-3" style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.25 }}>
            Consejos para identificar{" "}
            <span className="text-[#1e4f9c] dark:text-blue-300">noticias falsas</span>
          </h1>
          <p className="text-gray-500 max-w-lg mx-auto" style={{ lineHeight: 1.7 }}>
            El pensamiento crítico es la mejor herramienta contra la desinformación. Aprende a reconocer las señales más comunes.
          </p>
        </div>

        {/* Tips grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {tips.map((tip, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${tip.wrapClass}`}>
                  <tip.icon className={`w-5 h-5 ${tip.iconClass}`} />
                </div>
                <div>
                  <h3 className="text-gray-900" style={{ fontWeight: 600 }}>{tip.title}</h3>
                </div>
              </div>
              <p className="text-gray-600 mb-3" style={{ fontSize: "0.875rem", lineHeight: 1.6 }}>
                {tip.desc}
              </p>
              <div className="flex flex-col gap-1.5">
                {tip.steps.map((step, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <CheckCircle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${tip.iconClass}`} />
                    <span className="text-gray-500" style={{ fontSize: "0.8rem", lineHeight: 1.5 }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Red flags */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-gray-900" style={{ fontSize: "1.1rem", fontWeight: 600 }}>
              Señales de alerta típicas de noticias falsas
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {redFlags.map((flag, i) => (
              <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-100">
                <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5" style={{ fontWeight: 700 }}>
                  !
                </span>
                <span className="text-red-800" style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>{flag}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Share tips CTA */}
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: "linear-gradient(135deg, #1e4f9c, #3b82f6)" }}
        >
          <Share2 className="w-8 h-8 text-white/80 mx-auto mb-3" />
          <h3 className="text-white mb-2" style={{ fontSize: "1.1rem", fontWeight: 700 }}>
            Comparte estos consejos
          </h3>
          <p className="text-blue-100 mb-4" style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
            La lucha contra la desinformación es responsabilidad de todos. Comparte estos consejos con personas de tu entorno.
          </p>
          <button
            className="bg-white text-blue-700 px-6 py-2.5 rounded-xl hover:bg-blue-50 transition-colors"
            style={{ fontWeight: 600, fontSize: "0.9rem" }}
          >
            Compartir consejos
          </button>
        </div>
      </div>
    </div>
  );
}
