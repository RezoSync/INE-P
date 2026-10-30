import { SectionHeading } from "./SectionHeading"
import { SectionActions } from "./SectionActions"

const answers = [
  {
    title: "¿De dónde vienen los datos?",
    body: "De la Plataforma CCPC del Instituto Nacional Electoral (INE), con tres tableros: Datos generales, Datos comparativos y Datos sociodemográficos. Las cifras se transcribieron a archivos CSV locales y este portal no consulta ningún servicio externo.",
  },
  {
    title: "¿Cómo se calcula la participación?",
    body: "Se divide el número de personas que sí votaron entre la suma de quienes sí votaron y quienes no votaron, y el resultado se multiplica por 100. La lista nominal no se usa como denominador. Se muestra el porcentaje oficial del INE; la fórmula solo sirve para comprobarlo, con una tolerancia de 0.06 puntos.",
  },
  {
    title: "¿Qué elecciones aparecen?",
    body: "Seis procesos de 2009 a 2024. Las presidenciales (2012, 2018 y 2024) y las intermedias (2009, 2015 y 2021) se muestran por separado porque no son comparables entre sí.",
  },
  {
    title: "¿Qué significa “Dato pendiente”?",
    body: "Que la fuente disponible no entrega ese dato. Por ejemplo, la participación por estado solo está disponible para 2024. En esos casos no se estima ni se completa con cálculos.",
  },
  {
    title: "¿Composición o participación?",
    body: "Las gráficas de etapa de vida y tipo de sección muestran qué parte de las personas votantes pertenece a cada grupo. No indican qué porcentaje de cada grupo salió a votar.",
  },
  {
    title: "¿Puedo usar los datos?",
    body: "Sí. Cada sección tiene un botón para descargar sus datos en CSV, que abre en Excel o cualquier hoja de cálculo, y otro para copiar el enlace directo a esa sección.",
  },
]

export function DataSources() {
  return (
    <section className="section" id="origen-datos" aria-labelledby="data-sources-title">
      <div className="container">
        <SectionHeading
          number="04"
          eyebrow="Transparencia"
          title={<span id="data-sources-title">¿De dónde salen<br />estos datos?</span>}
          description="Todo lo que ves aquí proviene de cifras oficiales del INE. Estas son las respuestas a las dudas más comunes."
        />
        <div className="data-sources-grid">
          {answers.map(({ title, body }) => (
            <article className="data-source-card" key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
        <SectionActions sectionId="origen-datos" />
      </div>
    </section>
  )
}
