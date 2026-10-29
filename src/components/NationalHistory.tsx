import { SectionHeading } from "./SectionHeading"
import { Timeline } from "./Timeline"
import { PrecisionChip, formatPercent } from "./DataStatus"
import type { DashboardData, ElectionRecord } from "../data/types"

const quartileFormatter = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 })

function SeriesChart({
  title,
  records,
  kind,
}: {
  title: string
  records: ElectionRecord[]
  kind: "presidencial" | "intermedia"
}) {
  return (
    <article className={`series-card ${kind}`}>
      <h3>{title}</h3>
      <p className="series-description">Eje vertical desde 0 · porcentaje de participación</p>
      <div className="bar-chart" role="img" aria-label={`${title}: participación en elecciones`}>
        {[0, 20, 40, 60, 80, 100].map((tick) => (
          <span key={tick} className="axis-label" style={{ bottom: `${tick}%` }}>{tick}%</span>
        ))}
        <div className="bar-grid">
          {records.map((record) => (
            <div className="chart-bar" key={record.year}>
              <span className="bar-value">
                {record.value === null ? "Dato pendiente" : formatPercent(record.value)}
              </span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ height: `${record.value ?? 0}%` }}
                  aria-hidden="true"
                />
              </div>
              <strong>{record.year}</strong>
              {record.value !== null && <PrecisionChip statistic={record} />}
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}

export function NationalHistory({ data }: { data: DashboardData }) {
  const presidential = data.national
    .filter((record) => record.kind === "presidencial" && record.value !== null)
    .sort((left, right) => (right.value ?? 0) - (left.value ?? 0))[0]
  const intermediate = data.national
    .filter((record) => record.kind === "intermedia" && record.value !== null)
    .sort((left, right) => (left.value ?? 0) - (right.value ?? 0))[0]
  const insight =
    presidential && intermediate
      ? `La participación presidencial más alta fue ${formatPercent(presidential.value)} en ${presidential.year}; la intermedia más baja fue ${formatPercent(intermediate.value)} en ${intermediate.year}.`
      : "Dato pendiente: aún no se puede comparar la participación entre elecciones."

  return (
    <section className="section section-warm" id="historia">
      <div className="container">
        <SectionHeading
          number="01"
          eyebrow="Quince años en perspectiva"
          title={<>Cada elección cuenta<br />una historia distinta.</>}
          description="Los procesos presidenciales y las elecciones intermedias se presentan en series separadas. La participación usa únicamente votantes y no votantes como denominador."
        />
        <Timeline records={data.national} />
        <div className="series-grid">
          <SeriesChart
            title="Elecciones presidenciales"
            kind="presidencial"
            records={data.national.filter(({ kind }) => kind === "presidencial")}
          />
          <SeriesChart
            title="Elecciones intermedias"
            kind="intermedia"
            records={data.national.filter(({ kind }) => kind === "intermedia")}
          />
        </div>
        <p className="history-insight">{insight}</p>
        <section className="quartile-section" aria-labelledby="quartile-title">
          <div className="quartile-heading">
            <div>
              <p className="eyebrow">Variación entre entidades</p>
              <h3 id="quartile-title">Cuartiles estatales</h3>
            </div>
            <p>Rango de participación estatal en cada elección: de mínimo a máximo. El tramo marcado contiene la mitad central de las entidades; la línea indica la mediana.</p>
          </div>
          <div className="quartile-chart" role="list" aria-label="Rango y cuartiles estatales por elección">
            {data.quartiles.map((record) => (
              <div className={`quartile-row ${record.kind}`} key={record.year} role="listitem">
                <strong>{record.year}</strong>
                <span className="quartile-kind">{record.kind === "presidencial" ? "Presidencial" : "Intermedia"}</span>
                <div
                  className="quartile-track"
                  role="img"
                  aria-label={`${record.year}: mínimo ${record.minimum} %, primer cuartil ${record.q1} %, mediana ${record.median} %, tercer cuartil ${record.q3} %, máximo ${record.maximum} %`}
                >
                  <span className="quartile-whisker" style={{ left: `${record.minimum}%`, width: `${record.maximum - record.minimum}%` }} />
                  <span className="quartile-box" style={{ left: `${record.q1}%`, width: `${record.q3 - record.q1}%` }} />
                  <span className="quartile-median" style={{ left: `${record.median}%` }} />
                </div>
                <span className="quartile-values">{[record.minimum, record.q1, record.median, record.q3, record.maximum].map((value) => quartileFormatter.format(value)).join(" · ")} %</span>
              </div>
            ))}
          </div>
          <div className="quartile-axis" aria-hidden="true"><span>0 %</span><span>50 %</span><span>100 %</span></div>
        </section>
      </div>
    </section>
  )
}
