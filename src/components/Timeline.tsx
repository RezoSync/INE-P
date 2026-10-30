import { elections } from "../data/elections"
import type { ElectionRecord } from "../data/types"

const voterFormatter = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const participationFormatter = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 })

export function Timeline({ records }: { records: ElectionRecord[] }) {
  return (
    <>
      <ol className="timeline" aria-label="Procesos electorales de 2009 a 2024">
        {elections.map(({ year, kind }) => {
          const record = records.find((item) => item.year === year)
          const voters =
            record?.voters === null || record?.voters === undefined
              ? "Dato pendiente"
              : `${voterFormatter.format(record.voters / 1_000_000)} millones de votantes`
          return (
            <li key={year} className={kind}>
              <span className="timeline-dot" aria-hidden="true" />
              <strong>{year}</strong>
              <span>{kind === "presidencial" ? "Presidencial" : "Intermedia"}</span>
              <span className="timeline-stat">{record?.value === null || record?.value === undefined ? "Dato pendiente" : `${participationFormatter.format(record.value)} %`}</span>
              <small>{voters}</small>
            </li>
          )
        })}
      </ol>
      <p className="chart-note timeline-note">
        Muestra la participación nacional y el número de personas votantes en cada proceso. No muestra participación por estado ni por grupo.
      </p>
    </>
  )
}
