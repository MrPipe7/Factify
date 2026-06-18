import { Shield, GraduationCap, Brain, AlertTriangle } from "../../components/Icons";

export function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg"
            style={{ background: "linear-gradient(135deg, #1e4f9c, #3b82f6)" }}
          >
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-gray-900 mb-3" style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.25 }}>
            Acerca de <span className="text-[#1e4f9c] dark:text-blue-300">Factify</span>
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto" style={{ lineHeight: 1.7, fontSize: "1rem" }}>
            Una plataforma web de verificación de noticias falsas mediante inteligencia artificial, orientada a combatir la desinformación con un enfoque educativo.
          </p>
        </div>

        {/* Origin */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-gray-900" style={{ fontSize: "1.1rem", fontWeight: 600 }}>Origen del proyecto</h2>
          </div>
          <p className="text-gray-600 mb-3" style={{ fontSize: "0.9rem", lineHeight: 1.7 }}>
            Factify es un proyecto académico desarrollado en la{" "}
            <strong>Universidad Andrés Bello</strong>, Facultad de Ingeniería, Escuela de Ingeniería en Computación e Informática, Viña del Mar, 2026.
          </p>
          <p className="text-gray-600" style={{ fontSize: "0.9rem", lineHeight: 1.7 }}>
            El proyecto surge ante la creciente problemática de la desinformación en redes sociales y la falta de herramientas accesibles para el usuario común que permitan verificar información antes de compartirla.
          </p>
          <div className="mt-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>Autor</p>
              <p className="text-gray-700" style={{ fontWeight: 600, fontSize: "0.9rem" }}>Felipe Figueroa</p>
            </div>
          </div>
        </div>

        {/* Problem */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
            <h2 className="text-gray-900" style={{ fontSize: "1.1rem", fontWeight: 600 }}>El problema que aborda</h2>
          </div>
          <p className="text-gray-600 mb-4" style={{ fontSize: "0.9rem", lineHeight: 1.7 }}>
            La desinformación en redes sociales se ha transformado en una problemática relevante. Las noticias falsas pueden difundirse con mayor rapidez que las verdaderas, ya que apelan a emociones y sorpresa de los usuarios.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              "Falta de hábitos de verificación de fuentes",
              "Ausencia de herramientas accesibles para usuarios comunes",
              "Algoritmos que priorizan contenido viral sobre contenido veraz",
              "Bajo nivel de alfabetización digital en la población",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 bg-orange-50 rounded-lg border border-orange-100">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5" style={{ fontWeight: 700 }}>
                  !
                </span>
                <span className="text-orange-800" style={{ fontSize: "0.825rem", lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-gray-900" style={{ fontSize: "1.1rem", fontWeight: 600 }}>¿Cómo funciona?</h2>
          </div>
          <div className="flex flex-col gap-3">
            {[
              {
                step: "1",
                title: "Ingreso de contenido",
                desc: "El usuario ingresa texto, titular o enlace de la noticia a verificar.",
              },
              {
                step: "2",
                title: "Consulta de fuentes reales",
                desc: "Factify busca en verificadores profesionales y en la web fuentes que respalden o desmienten la afirmación, evaluando su relevancia y credibilidad.",
              },
              {
                step: "3",
                title: "Clasificación basada en evidencia",
                desc: "El veredicto (confiable, dudoso o falso) y el porcentaje de confianza se calculan según cuántas fuentes confirman o refutan el contenido.",
              },
              {
                step: "4",
                title: "Explicación educativa",
                desc: "El sistema entrega una explicación clara y comprensible de los factores considerados en el resultado.",
              },
              {
                step: "5",
                title: "Alerta preventiva",
                desc: "Si el contenido es dudoso o falso, el sistema muestra una advertencia antes de compartir.",
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white mt-0.5"
                  style={{ background: "#1e4f9c", fontSize: "0.8rem", fontWeight: 700 }}
                >
                  {item.step}
                </div>
                <div>
                  <p className="text-gray-800" style={{ fontWeight: 600, fontSize: "0.9rem" }}>{item.title}</p>
                  <p className="text-gray-500 mt-0.5" style={{ fontSize: "0.825rem", lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
