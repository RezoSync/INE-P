const terms = [
  {
    term: "Lista nominal",
    definition:
      "Relación de personas registradas para votar. En este portal no se usa como denominador de la participación.",
  },
  {
    term: "Participación",
    definition:
      "Porcentaje de personas que sí votaron entre quienes sí votaron y quienes no votaron.",
  },
  {
    term: "Abstención",
    definition:
      "Personas que no votaron. Su conteo no debe confundirse con la lista nominal.",
  },
  {
    term: "Sección",
    definition:
      "Área geográfica electoral en la que se organiza el electorado y se instalan casillas.",
  },
  {
    term: "Cuartil",
    definition:
      "Punto que divide los datos ordenados en cuatro partes para resumir su distribución.",
  },
  {
    term: "Mediana",
    definition:
      "Valor central de los datos ordenados: la mitad queda por debajo y la otra mitad por encima.",
  },
  {
    term: "Composición",
    definition:
      "Reparto del total de personas votantes entre grupos; no indica qué proporción de cada grupo votó.",
  },
] as const

export function Glossary() {
  return (
    <aside className="glossary" aria-label="Glosario de términos electorales">
      <h2>En palabras sencillas</h2>
      <p>Selecciona un término para ver qué significa.</p>
      <ul>
        {terms.map(({ term, definition }) => {
          const id = `glossary-${term.toLowerCase().replace(/ /g, "-")}`
          return (
            <li key={term}>
              <details className="glossary-item">
                <summary aria-controls={id}>{term}</summary>
                <span className="glossary-tooltip" id={id} role="tooltip">
                  {definition}
                </span>
              </details>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
