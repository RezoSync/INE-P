import { useState, type KeyboardEvent } from "react"
import { elections } from "../data/elections"
import { SectionHeading } from "./SectionHeading"
import { Pending } from "./DataStatus"
import { SectionActions } from "./SectionActions"
import type { ElectionRecord, ProfileRecord } from "../data/types"

const profileTabs = [
  { id: "etapa_vida", label: "Etapa de vida" },
  { id: "tipo_seccion", label: "Tipo de sección" },
] as const

type ProfileDimension = (typeof profileTabs)[number]["id"]

const percentFormatter = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 })

function percentage(value: number): string {
  return `${percentFormatter.format(value)} %`
}

function CompositionTable({ records }: { records: ProfileRecord[] }) {
  return (
    <div className="table-scroll">
      <table>
        <caption>Composición porcentual del total de votantes por elección; no es una tasa de participación.</caption>
        <thead>
          <tr>
            <th scope="col">Año</th>
            <th scope="col">Tipo de elección</th>
            <th scope="col">Grupo</th>
            <th scope="col">Porcentaje de votantes</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={`${record.year}-${record.group}`}>
              <td>{record.year}</td>
              <td>{record.kind === "presidencial" ? "Presidencial" : "Intermedia"}</td>
              <th scope="row">{record.group}</th>
              <td>{percentage(record.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CompositionChart({ records, dimension }: { records: ProfileRecord[]; dimension: ProfileDimension }) {
  const groups = [...new Set(records.map(({ group }) => group))]
  return (
    <div className="composition-chart" role="group" aria-label="Composición de votantes por elección">
      {elections.map(({ year, kind }) => {
        const electionRecords = records.filter((record) => record.year === year)
        const total = electionRecords.reduce((sum, record) => sum + record.value, 0)
        return (
          <div className="composition-row" key={year}>
            <strong>{year}</strong>
            <span className="composition-kind">{kind === "presidencial" ? "Presidencial" : "Intermedia"}</span>
            <div className={`composition-stack ${dimension}`} role="img" aria-label={`${year}, ${kind === "presidencial" ? "presidencial" : "intermedia"}: ${electionRecords.map(({ group, value }) => `${group} ${percentage(value)}`).join(", ") || "Dato pendiente"}`}>
              {electionRecords.map((record) => (
                <span
                  className={`composition-segment color-${groups.indexOf(record.group) % 5}`}
                  key={record.group}
                  style={{ width: `${record.value}%` }}
                  title={`${record.group}: ${percentage(record.value)}`}
                />
              ))}
            </div>
            <span className="composition-total" title="Suma de los porcentajes recibidos; no se normaliza">
              {electionRecords.length ? percentage(total) : "Dato pendiente"}
            </span>
          </div>
        )
      })}
      <ul className="composition-legend" aria-label="Grupos de composición">
        {groups.map((group, index) => (
          <li key={group}><span className={`composition-key color-${index % 5}`} aria-hidden="true" />{group}</li>
        ))}
      </ul>
    </div>
  )
}

function AverageAgeChart({ records }: { records: ElectionRecord[] }) {
  const available = records.flatMap(({ averageAge }) => averageAge === null ? [] : [averageAge])
  const max = Math.max(...available, 1)
  return (
    <div className="average-age-chart" role="list" aria-label="Edad promedio de los votantes por elección">
      {elections.map(({ year, kind }) => {
        const age = records.find((record) => record.year === year)?.averageAge ?? null
        return (
          <div className={`average-age-item ${kind}`} key={year} role="listitem">
            <span className="average-age-value">{age === null ? "Dato pendiente" : `${percentFormatter.format(age)} años`}</span>
            <span className="average-age-track"><span style={{ height: age === null ? "0%" : `${(age / max) * 100}%` }} /></span>
            <strong>{year}</strong>
          </div>
        )
      })}
    </div>
  )
}

export function Profiles({ records, national }: { records: ProfileRecord[]; national: ElectionRecord[] }) {
  const [tab, setTab] = useState<ProfileDimension>("etapa_vida")
  const [showTable, setShowTable] = useState(false)
  const dimensionRecords = records.filter(({ dimension }) => dimension === tab)
  const label = profileTabs.find((item) => item.id === tab)?.label ?? "Composición"
  const handleTabKey = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()
    const direction = event.key === "ArrowRight" ? 1 : -1
    const next = (currentIndex + direction + profileTabs.length) % profileTabs.length
    const nextTab = profileTabs[next]!.id
    setTab(nextTab)
    setShowTable(false)
    document.getElementById(`tab-${nextTab}`)?.focus()
  }
  return (
    <section className="section section-blue" id="perfiles">
      <div className="container">
        <SectionHeading
          number="03"
          eyebrow="Composición de quienes votaron"
          title={<>¿Quiénes<br />votan?</>}
          description="Las siguientes gráficas muestran qué proporción del total de personas votantes pertenece a cada grupo. Son composición, no tasas de participación."
        />
        <div className="profile-card">
          <div className="tabs" role="tablist" aria-label="Composición de votantes">
            {profileTabs.map(({ id, label: tabLabel }, index) => (
              <button
                id={`tab-${id}`}
                key={id}
                role="tab"
                aria-selected={tab === id}
                aria-controls="profile-panel"
                tabIndex={tab === id ? 0 : -1}
                onClick={() => { setTab(id); setShowTable(false) }}
                onKeyDown={(event) => handleTabKey(event, index)}
              >
                {tabLabel}
              </button>
            ))}
          </div>
          <div id="profile-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
            <div className="profile-chart-heading">
              <div>
                <h3>Composición de votantes: {label.toLowerCase()}</h3>
                <p>
                  Muestra qué proporción del total de votantes pertenece a cada {label.toLowerCase()}. No muestra qué proporción de cada grupo votó. Se conserva el redondeo de la fuente y no se normalizan los totales.
                </p>
              </div>
              {dimensionRecords.length > 0 && (
                <button className="button button-secondary" aria-controls="composition-content" aria-pressed={showTable} onClick={() => setShowTable((shown) => !shown)}>
                  {showTable ? "Ver gráfica" : "Ver tabla"}
                </button>
              )}
            </div>
            {dimensionRecords.length ? (
              <div id="composition-content">
                {showTable ? <CompositionTable records={dimensionRecords} /> : <CompositionChart records={dimensionRecords} dimension={tab} />}
              </div>
            ) : (
              <div className="profile-pending">
                <Pending reason="Los archivos disponibles no incluyen datos de composición para esta categoría." />
              </div>
            )}
          </div>
          <p className="source-note">Fuente: Plataforma CCPC 2009–2024, INE. Los porcentajes se muestran tal como aparecen en la fuente, incluso cuando por redondeo suman menos o más de 100 %.</p>
          <SectionActions
            sectionId="perfiles"
            fileName={`composicion-votantes-${tab === "etapa_vida" ? "etapa-de-vida" : "tipo-de-seccion"}`}
            rows={dimensionRecords.length ? dimensionRecords.map((record) => ({
              Año: record.year,
              "Tipo de elección": record.kind === "presidencial" ? "Presidencial" : "Intermedia",
              Categoría: label,
              Grupo: record.group,
              "Porcentaje de votantes (%)": record.value,
              "Total de votantes": record.totalVoters,
              Fuente: record.source,
            })) : undefined}
          />
        </div>

        <section className="age-section" aria-labelledby="average-age-title">
          <div className="age-heading">
            <div>
              <p className="eyebrow">Dato secundario</p>
              <h3 id="average-age-title">Edad promedio de los votantes</h3>
            </div>
            <p>Edad promedio registrada en el tablero del INE para cada proceso.</p>
          </div>
          <AverageAgeChart records={national} />
          <p className="chart-note">
            Muestra la edad promedio de las personas votantes por elección. No muestra cuántas personas votaron en cada edad ni la participación por edad.
          </p>
        </section>

        <aside className="age-sex-pending" aria-label="Desgloses de participación pendientes">
          {["edad", "sexo", "tipo de sección"].map((dimension) => (
            <div className="pending-dimension" key={dimension}>
              <Pending
                compact
                reason={`La Plataforma CCPC no ofrece la tasa de participación por ${dimension} en los datos disponibles.`}
              />
              <div>
                <h3>Tasa de participación por {dimension}</h3>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </section>
  )
}
