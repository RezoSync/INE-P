import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react"
import * as d3 from "d3"
import { feature } from "topojson-client"
import type { Topology } from "topojson-specification"
import { dashboardSchema } from "./data/schemas"
import { elections } from "./data/elections"
import { getMapBucket, createMapRanges } from "./data/map-scale"
import { Pending, formatPercent, preciseLabel } from "./components/DataStatus"
import { NationalHistory } from "./components/NationalHistory"
import { Profiles } from "./components/Profiles"
import { DataSources } from "./components/DataSources"
import { SectionHeading } from "./components/SectionHeading"
import { Glossary } from "./components/Glossary"
import { QuickQuestions } from "./components/QuickQuestions"
import { Footer, Header } from "./components/SiteChrome"
import { SectionActions } from "./components/SectionActions"
import type {
  DashboardData,
  EntityRecord,
  ElectionRecord,
} from "./data/types"

const oneDecimalFormatter = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

function recordForYear(
  records: ElectionRecord[],
  year: number,
): ElectionRecord | undefined {
  return records.find((record) => record.year === year)
}

function getEntityName(featureProperties: Record<string, unknown> | null): string {
  const candidates = [
    featureProperties?.nombre,
    featureProperties?.NOMGEO,
    featureProperties?.NOMGEO_1,
    featureProperties?.name,
    featureProperties?.NAME_1,
    featureProperties?.entidad,
  ]
  return String(candidates.find((candidate) => typeof candidate === "string") ?? "")
}

function getEntityCode(featureProperties: Record<string, unknown> | null): string {
  return typeof featureProperties?.clave === "string" ? featureProperties.clave : ""
}

function normalizeEntityName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^estado de\s+/i, "")
    .trim()
    .toLowerCase()
}

async function loadDashboard(): Promise<DashboardData> {
  const response = await fetch("/data/dashboard.json", { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`No se pudo cargar el archivo local de datos (${response.status}).`)
  }
  const parsed: unknown = await response.json()
  return dashboardSchema.parse(parsed)
}

class ErrorBoundary extends Component<
  { children: ReactNode; onRetry: () => void },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error de interfaz:", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <main className="fatal-error" role="alert">
          <p className="eyebrow">Ocurrió un error</p>
          <h1>No pudimos mostrar el contenido.</h1>
          <p>{this.state.error.message}</p>
          <button className="button button-light" onClick={this.props.onRetry}>
            Reintentar
          </button>
        </main>
      )
    }
    return this.props.children
  }
}

function Skeleton() {
  return (
    <div className="loading-shell" role="status" aria-label="Cargando datos">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-copy" />
      <div className="skeleton skeleton-card" />
    </div>
  )
}

function Hero({ data }: { data: DashboardData }) {
  const latest = recordForYear(data.national, 2024)
  const available = data.national.filter(({ value }) => value !== null)
  const max = Math.max(...available.map(({ value }) => value ?? 0), 1)
  const min = Math.min(...available.map(({ value }) => value ?? 0), 0)
  const spread = max - min || 1
  const sparklinePoints = (kind: ElectionRecord["kind"]) =>
    data.national
      .filter((record) => record.kind === kind && record.value !== null)
      .map((record) => {
        const index = elections.findIndex((election) => election.year === record.year)
        const x = 8 + (index * 344) / (elections.length - 1)
        const y = 82 - (((record.value ?? min) - min) / spread) * 55
        return { x, y, year: record.year }
      })
  return (
    <section className="hero" id="inicio">
      <div className="container hero-grid">
        <div>
          <span className="hero-kicker">Plataforma CCPC · 2009–2024 · INE</span>
          <h1>15 años<br />de <em>tu voto</em></h1>
          <p className="hero-lead">
            Una mirada a la participación electoral en México, proceso por
            proceso y entidad por entidad, con datos documentados.
          </p>
          <a className="button button-light" href="#historia">Explorar la historia <span aria-hidden="true">↓</span></a>
          <Glossary />
        </div>
        <div className="hero-stat">
          <p className="eyebrow">Participación nacional · 2024</p>
          {latest?.value === null || latest?.value === undefined ? (
            <Pending reason="La fuente disponible no reporta el porcentaje nacional de participación para 2024." />
          ) : (
            <>
              <strong>{formatPercent(latest.value)}</strong>
              <span className="hero-official">Oficial · INE</span>
            </>
          )}
          {latest?.voters !== null && latest?.voters !== undefined && latest.value !== null && latest.value !== undefined && (
            <p className="hero-summary">
              En 2024 votaron{" "}
              <strong>
                {new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(latest.voters / 1_000_000)} millones de personas
              </strong>
              : cerca de {Math.round(latest.value / 10)} de cada 10 entre quienes sí votaron y quienes no votaron.
            </p>
          )}
          <p className="hero-stat-note">
            Edad promedio de las personas votantes · {latest?.averageAge === null || latest?.averageAge === undefined
              ? "Dato pendiente"
              : `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(latest.averageAge)} años`}
          </p>
          <svg
            className="hero-sparkline"
            viewBox="0 0 360 110"
            role="img"
            aria-label="Mini gráfica con los valores disponibles de 2009 a 2024"
          >
            {(["presidencial", "intermedia"] as const).map((kind) => {
              const pointsForKind = sparklinePoints(kind)
              return (
                <g key={kind} className={kind}>
                  {pointsForKind.length > 1 && (
                    <polyline points={pointsForKind.map(({ x, y }) => `${x},${y}`).join(" ")} />
                  )}
                  {pointsForKind.map(({ x, y, year }) => <circle key={year} cx={x} cy={y} r="5" />)}
                </g>
              )
            })}
            <text x="8" y="106">2009</text><text x="352" y="106">2024</text>
          </svg>
          <p className="chart-note">
            La línea resume los porcentajes nacionales disponibles y mantiene separadas las elecciones presidenciales e intermedias. No muestra participación por estado ni por grupo.
          </p>
        </div>
      </div>
    </section>
  )
}

function MapLegend({ records, year }: { records: EntityRecord[]; year: number }) {
  const ranges = useMemo(
    () =>
      createMapRanges(
        records.flatMap(({ elections: entityElections }) => {
          const value = recordForYear(entityElections, year)?.value
          return value === null || value === undefined ? [] : [value]
        }),
      ),
    [records, year],
  )
  const rangeLabel = (index: number) => {
    const range = ranges[index]
    return range
      ? `${oneDecimalFormatter.format(range.min)}–${oneDecimalFormatter.format(range.max)} %`
      : "Rango pendiente"
  }
  if (!ranges.length) {
    return (
      <p className="map-legend-pending">
        No hay datos estatales publicados para {year}; las entidades se muestran como “Dato pendiente”.
      </p>
    )
  }
  return (
    <div className="map-legend" aria-label="Rangos de participación calculados con los datos disponibles">
      {Array.from({ length: 4 }, (_, index) => (
        <span key={index}>
          <i className={`map-swatch swatch-${index}`} aria-hidden="true" />
          {rangeLabel(index)}
        </span>
      ))}
      <span><i className="map-swatch swatch-pending" aria-hidden="true" />Dato pendiente</span>
    </div>
  )
}

function MexicoMap({
  data,
  selected,
  year,
  retryToken,
  onSelect,
}: {
  data: DashboardData
  selected: EntityRecord
  year: number
  retryToken: number
  onSelect: (entity: EntityRecord) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const zoomTransformRef = useRef(d3.zoomIdentity)
  const [mapError, setMapError] = useState<string | null>(null)
  const [mapLoading, setMapLoading] = useState(data.map.topologyAvailable)
  const [zoomScale, setZoomScale] = useState(1)
  useEffect(() => {
    if (!data.map.topologyAvailable || !data.map.objectName || !svgRef.current) return
    let active = true
    setMapLoading(true)
    void fetch("/data/mexico.topo.json", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`No se pudo cargar el mapa local (${response.status}).`)
        return (await response.json()) as Topology
      })
      .then((topology) => {
        if (!active || !svgRef.current || !data.map.objectName) return
        const geometry = topology.objects[data.map.objectName]
        if (!geometry) throw new Error("No se encontró el objeto geográfico declarado.")
        const collection = feature(topology, geometry)
        const features =
          collection.type === "FeatureCollection" ? collection.features : [collection]
        const projection = d3.geoMercator().fitSize([700, 460], collection)
        const path = d3.geoPath(projection)
        const svg = d3.select(svgRef.current)
        svg.selectAll("*").remove()
        const values = data.entities.flatMap(({ elections: records }) => {
          const value = recordForYear(records, year)?.value
          return value === null || value === undefined ? [] : [value]
        })
        const ranges = createMapRanges(values)
        const styles = getComputedStyle(document.documentElement)
        const fills = [0, 1, 2, 3].map((index) =>
          styles.getPropertyValue(`--map-${index}`).trim(),
        )
        const group = svg.append("g")
        const paths = group
          .selectAll<SVGPathElement, (typeof features)[number]>("path")
          .data(features)
          .join("path")
          .attr("d", (item) => path(item) ?? "")
          .attr("data-entity-code", (item) =>
            getEntityCode(item.properties as Record<string, unknown> | null),
          )
          .attr("fill", (item) => {
            const code = getEntityCode(item.properties as Record<string, unknown> | null)
            const entity = data.entities.find(({ code: entityCode }) => entityCode === code)
            const value = entity ? recordForYear(entity.elections, year)?.value : null
            return value === null || value === undefined
              ? "url(#missing-data-pattern)"
              : fills[getMapBucket(value, ranges)] || "var(--map-0)"
          })
          .attr("stroke", (item) => {
            const code = getEntityCode(item.properties as Record<string, unknown> | null)
            return code === selected.code
              ? "var(--magenta)"
              : "var(--map-outline)"
          })
          .attr("stroke-width", (item) => {
            const code = getEntityCode(item.properties as Record<string, unknown> | null)
            return code === selected.code ? 3 : 1
          })
          .attr("tabindex", 0)
          .attr("role", "button")
          .attr("aria-label", (item) => {
            const code = getEntityCode(item.properties as Record<string, unknown> | null)
            const entity = data.entities.find(({ code: entityCode }) => entityCode === code)
            const name = entity?.name ?? getEntityName(item.properties as Record<string, unknown> | null)
            return `${name}: ${formatPercent(entity ? recordForYear(entity.elections, year)?.value ?? null : null)}`
          })
          .on("click", (_event, item) => {
            const code = getEntityCode(item.properties as Record<string, unknown> | null)
            const entity = data.entities.find(({ code: entityCode }) => entityCode === code)
            if (entity) onSelect(entity)
          })
          .on("keydown", (event: KeyboardEvent, item) => {
            if (event.key !== "Enter" && event.key !== " ") return
            event.preventDefault()
            const code = getEntityCode(item.properties as Record<string, unknown> | null)
            const entity = data.entities.find(({ code: entityCode }) => entityCode === code)
            if (entity) onSelect(entity)
          })
          .on("mouseenter", function () {
            d3.select(this).attr("stroke", "var(--magenta)").attr("stroke-width", 3)
          })
          .on("mouseleave", function (_event, item) {
            const code = getEntityCode(item.properties as Record<string, unknown> | null)
            d3.select(this)
              .attr("stroke", code === selected.code ? "var(--magenta)" : "var(--map-outline)")
              .attr("stroke-width", code === selected.code ? 3 : 1)
          })
        group
          .selectAll<SVGTextElement, (typeof features)[number]>("text")
          .data(features)
          .join("text")
          .attr("x", (item) => path.centroid(item)[0] ?? 0)
          .attr("y", (item) => path.centroid(item)[1] ?? 0)
          .attr("text-anchor", "middle")
          .attr("font-size", "11px")
          .attr("pointer-events", "none")
          .attr("fill", (item) => {
            const code = getEntityCode(item.properties as Record<string, unknown> | null)
            const entity = data.entities.find(({ code: entityCode }) => entityCode === code)
            const value = entity ? recordForYear(entity.elections, year)?.value : null
            return value !== null && value !== undefined && ranges.length && getMapBucket(value, ranges) === 3
              ? "var(--paper)"
              : "var(--ink)"
          })
          .text((item) => getEntityName(item.properties as Record<string, unknown> | null))
        paths.append("title").text((item) => getEntityName(item.properties as Record<string, unknown> | null))
        const zoom = d3
          .zoom<SVGSVGElement, unknown>()
          .scaleExtent([1, 5])
          .on("zoom", (event) => {
            zoomTransformRef.current = event.transform
            setZoomScale(event.transform.k)
            group.attr("transform", event.transform.toString())
          })
        zoomRef.current = zoom
        svg.call(zoom)
        svg.call(zoom.transform, zoomTransformRef.current)
        setMapError(null)
        setMapLoading(false)
      })
      .catch((error: unknown) => {
        if (active) {
          setMapError(error instanceof Error ? error.message : "Error al cargar el mapa local.")
          setMapLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [data, onSelect, retryToken, selected.name, year])

  if (!data.map.topologyAvailable) {
    return (
      <div className="map-empty" role="status">
        <Pending reason="No hay una geometría local validada para mostrar el mapa." />
        <p>{data.map.topologyError ?? "La geometría TopoJSON local no está disponible."}</p>
      </div>
    )
  }
  if (mapError) {
    return (
      <div className="map-empty" role="alert">
        <p>{mapError}</p>
      </div>
    )
  }
  return (
    <div className="map-visualization">
      {mapLoading && <div className="map-loading-overlay" role="status">Cargando el mapa local de las 32 entidades…</div>}
      <svg
        className="mexico-map"
        ref={svgRef}
        viewBox="0 0 700 460"
        role="group"
        aria-label={`Mapa de las entidades de México, ${year}`}
      >
        <defs>
          <pattern id="missing-data-pattern" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="var(--map-pending)" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--map-pending-line)" strokeWidth="3" />
          </pattern>
        </defs>
      </svg>
      <div className="map-zoom-controls" role="group" aria-label="Controles de acercamiento del mapa">
          <button
            type="button"
            aria-label="Acercar mapa"
            onClick={() => {
              if (svgRef.current && zoomRef.current) {
                d3.select(svgRef.current).call(zoomRef.current.scaleBy, 1.5)
              }
            }}
          >+</button>
          <button
            type="button"
            aria-label="Alejar mapa"
            onClick={() => {
              if (svgRef.current && zoomRef.current) {
                d3.select(svgRef.current).call(zoomRef.current.scaleBy, 1 / 1.5)
              }
            }}
          >−</button>
          <button
            type="button"
            aria-label="Restablecer acercamiento del mapa"
            onClick={() => {
              if (svgRef.current && zoomRef.current) {
                d3.select(svgRef.current).call(zoomRef.current.transform, d3.zoomIdentity)
              }
            }}
          >Restablecer</button>
          <span aria-live="polite">{Math.round(zoomScale * 100)} %</span>
      </div>
    </div>
  )
}

function StatesTable({
  entities,
  selected,
  year,
  onSelect,
}: {
  entities: EntityRecord[]
  selected: EntityRecord
  year: number
  onSelect: (entity: EntityRecord) => void
}) {
  const [sortColumn, setSortColumn] = useState<"name" | "value">("name")
  const [sortAscending, setSortAscending] = useState(true)
  const sortBy = (column: "name" | "value") => {
    if (column === sortColumn) {
      setSortAscending((current) => !current)
    } else {
      setSortColumn(column)
      setSortAscending(column === "name")
    }
  }
  const sorted = useMemo(
    () => [...entities].sort((left, right) => {
      if (sortColumn === "name") {
        return sortAscending
          ? left.name.localeCompare(right.name, "es")
          : right.name.localeCompare(left.name, "es")
      }
      const leftValue = recordForYear(left.elections, year)?.value ?? null
      const rightValue = recordForYear(right.elections, year)?.value ?? null
      if (leftValue === null && rightValue !== null) return 1
      if (leftValue !== null && rightValue === null) return -1
      if (leftValue === null || rightValue === null) return left.name.localeCompare(right.name, "es")
      return sortAscending ? leftValue - rightValue : rightValue - leftValue
    }),
    [entities, sortAscending, sortColumn, year],
  )
  return (
    <div className="table-scroll">
      <table>
        <caption>Participación por entidad, {year}</caption>
        <thead>
          <tr>
            <th scope="col">
              <button
                className="sort-button"
                onClick={() => sortBy("name")}
                aria-label={`Ordenar entidad ${sortAscending ? "descendente" : "ascendente"}`}
              >
                Entidad {sortColumn === "name" ? (sortAscending ? "↑" : "↓") : ""}
              </button>
            </th>
            <th scope="col">
              <button
                className="sort-button"
                onClick={() => sortBy("value")}
                aria-label={`Ordenar participación ${sortAscending ? "descendente" : "ascendente"}`}
              >
                Participación {sortColumn === "value" ? (sortAscending ? "↑" : "↓") : ""}
              </button>
            </th>
            <th scope="col">Precisión</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entity) => {
            const statistic = recordForYear(entity.elections, year)
            return (
              <tr key={entity.code} className={selected.code === entity.code ? "selected-row" : ""}>
                <th scope="row">
                  <button className="table-select" onClick={() => onSelect(entity)}>{entity.name}</button>
                </th>
                <td>{formatPercent(statistic?.value ?? null)}</td>
                <td>{statistic ? preciseLabel(statistic) : "Dato pendiente"}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function StateCard({
  entity,
  year,
  national,
  median,
  ranking,
  onDownload,
}: {
  entity: EntityRecord
  year: number
  national: ElectionRecord | undefined
  median: number | undefined
  ranking: number | null
  onDownload: () => void
}) {
  const current = recordForYear(entity.elections, year)
  const nationalDifference =
    current?.value !== null &&
    current?.value !== undefined &&
    national?.value !== null &&
    national?.value !== undefined
      ? current.value - national.value
      : null
  const medianDifference =
    current?.value !== null &&
    current?.value !== undefined &&
    median !== null &&
    median !== undefined
      ? current.value - median
      : null
  const countFormatter = new Intl.NumberFormat("es-MX")
  return (
    <article className="state-card">
      <div className="state-card-header">
        <p className="eyebrow">Ficha de la entidad</p>
        <span>{year}</span>
      </div>
      <h3>{entity.name}</h3>
      {current?.value === null || current?.value === undefined ? (
        <Pending reason={`La fuente disponible no incluye la participación estatal de ${year}; el dato se conserva pendiente.`} />
      ) : (
        <>
          <strong className="state-value">{formatPercent(current.value)}</strong>
          <span className={`precision-chip ${current.precision ?? ""}`}>{preciseLabel(current)}</span>
        </>
      )}
      <div className="state-comparison">
        <span>Posición entre las entidades con dato</span>
        <strong>{ranking === null ? "Dato pendiente" : `${ranking} de 32`}</strong>
        <span>Promedio nacional</span>
        <strong>{formatPercent(national?.value ?? null)}</strong>
        <span>Diferencia frente al promedio nacional</span>
        <strong>{formatDifference(nationalDifference)}</strong>
        <span>Mediana estatal</span>
        <strong>{median === undefined ? "Dato pendiente" : formatPercent(median)}</strong>
        <span>Diferencia frente a la mediana</span>
        <strong>{formatDifference(medianDifference)}</strong>
      </div>
      {year === 2024 && (
        <dl className="state-counts">
          <div><dt>Sí votaron</dt><dd>{current?.voters === null || current?.voters === undefined ? "Dato pendiente" : countFormatter.format(current.voters)}</dd></div>
          <div><dt>No votaron</dt><dd>{current?.nonVoters === null || current?.nonVoters === undefined ? "Dato pendiente" : countFormatter.format(current.nonVoters)}</dd></div>
          <div><dt>Lista nominal</dt><dd>{entity.listNominal === null ? "Dato pendiente" : countFormatter.format(entity.listNominal)}</dd></div>
          <div><dt>Votos no esp.</dt><dd>{entity.votesNoEsp === null ? "Dato pendiente" : countFormatter.format(entity.votesNoEsp)}</dd></div>
          <div><dt>IML</dt><dd>{entity.iml === null ? "Dato pendiente" : entity.iml}</dd></div>
          <div><dt>IMV</dt><dd>{entity.imv === null ? "Dato pendiente" : entity.imv}</dd></div>
        </dl>
      )}
      <p className="state-pending-note">
        {year === 2024
          ? "Participación por estado de 2009 a 2021: dato pendiente. La fuente consultada solo incluye el desglose estatal de 2024."
          : `La fuente consultada solo incluye el desglose estatal de 2024. Para ${year}, la participación por entidad sigue como “Dato pendiente”.`}
      </p>
      <button className="button button-secondary button-full" onClick={onDownload}>Descargar ficha PNG</button>
    </article>
  )
}

function formatDifference(value: number | null): string {
  return value === null
    ? "Dato pendiente"
    : `${value > 0 ? "+" : ""}${oneDecimalFormatter.format(value)} puntos`
}

function EntityComparisonCard({ entity, year }: { entity: EntityRecord; year: number }) {
  const statistic = recordForYear(entity.elections, year)
  return (
    <article className="entity-comparison-card">
      <h4>{entity.name}</h4>
      {statistic?.value === null || statistic?.value === undefined ? (
        <Pending reason={`La fuente no incluye participación estatal para ${year}; el dato sigue pendiente.`} />
      ) : (
        <>
          <strong>{formatPercent(statistic.value)}</strong>
          <span>{preciseLabel(statistic)}</span>
        </>
      )}
    </article>
  )
}

async function drawDownloadCard(
  entity: EntityRecord,
  statistic: ElectionRecord | undefined,
  year: number,
  position: number | null,
  comparison: number | null,
  nationalValue: number | null,
  topologyAvailable: boolean,
  objectName: string | null,
): Promise<void> {
  await document.fonts.ready
  const canvas = document.createElement("canvas")
  canvas.width = 1200
  canvas.height = 1200
  const context = canvas.getContext("2d")
  if (!context) throw new Error("El navegador no pudo crear la imagen descargable.")
  const styles = getComputedStyle(document.documentElement)
  const color = (name: string) => styles.getPropertyValue(name).trim()
  const drawWrappedText = (value: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const words = value.split(/\s+/)
    let line = ""
    let lineY = y
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (context.measureText(candidate).width > maxWidth && line) {
        context.fillText(line, x, lineY)
        line = word
        lineY += lineHeight
      } else {
        line = candidate
      }
    }
    if (line) context.fillText(line, x, lineY)
  }
  context.fillStyle = color("--paper")
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = color("--wine")
  context.fillRect(0, 0, canvas.width, 22)
  context.fillStyle = color("--ink")
  context.font = "700 36px Montserrat, sans-serif"
  context.fillText("15 años de tu voto", 76, 110)
  context.font = "700 62px Montserrat, sans-serif"
  let nameSize = 62
  while (context.measureText(entity.name).width > 1020 && nameSize > 34) {
    nameSize -= 2
    context.font = `700 ${nameSize}px Montserrat, sans-serif`
  }
  context.fillText(entity.name, 76, 245)
  context.fillStyle = color("--magenta")
  let valueFontSize = 160
  const participationText = statistic?.value === null || statistic?.value === undefined
    ? "Dato pendiente"
    : formatPercent(statistic.value)
  context.font = `700 ${valueFontSize}px Montserrat, sans-serif`
  while (context.measureText(participationText).width > 570 && valueFontSize > 48) {
    valueFontSize -= 4
    context.font = `700 ${valueFontSize}px Montserrat, sans-serif`
  }
  context.fillText(participationText, 72, 475)
  context.fillStyle = color("--muted")
  context.font = "500 28px 'Noto Sans', sans-serif"
  context.fillText(position === null ? "Posición: Dato pendiente" : `Posición ${position} de 32`, 82, 535)
  drawWrappedText(
    comparison === null
      ? `Diferencia frente al promedio nacional (${formatPercent(nationalValue)}): Dato pendiente`
      : `${comparison > 0 ? "+" : ""}${oneDecimalFormatter.format(comparison)} puntos frente al promedio nacional (${formatPercent(nationalValue)})`,
    82,
    580,
    540,
    34,
  )
  context.font = "500 22px 'Noto Sans', sans-serif"
  drawWrappedText(statistic?.source ?? "Fuente pendiente · Plataforma CCPC 2009–2024, INE", 82, 635, 540, 30)
  context.fillText(`Año ${year} · ${statistic ? preciseLabel(statistic) : "Dato pendiente"} · INE`, 82, 710)

  const mapX = 695
  const mapY = 760
  if (topologyAvailable && objectName) {
    const response = await fetch("/data/mexico.topo.json", { cache: "no-store" })
    if (!response.ok) throw new Error("No se pudo cargar el mapa INEGI para la ficha PNG.")
    const topology = (await response.json()) as Topology
    const geometry = topology.objects[objectName]
    if (!geometry) throw new Error("No se encontró la geometría del mapa para la ficha PNG.")
    const collection = feature(topology, geometry)
    const features = collection.type === "FeatureCollection" ? collection.features : [collection]
    const projection = d3.geoMercator().fitSize([420, 270], collection).translate([mapX + 210, mapY + 135])
    const path = d3.geoPath(projection, context)
    for (const mapFeature of features) {
      const name = getEntityName(mapFeature.properties as Record<string, unknown> | null)
      context.beginPath()
      path(mapFeature)
      context.fillStyle =
        normalizeEntityName(name) === normalizeEntityName(entity.name)
          ? color("--magenta")
          : color("--map-pending")
      context.fill()
      context.strokeStyle = color("--paper")
      context.lineWidth = 2
      context.stroke()
    }
  } else {
    context.fillStyle = color("--map-pending")
    context.fillRect(mapX, mapY, 420, 270)
    context.fillStyle = color("--muted")
    context.font = "600 24px 'Noto Sans', sans-serif"
    context.fillText("Mapa pendiente", mapX + 108, mapY + 145)
  }
  context.fillStyle = color("--wine")
  context.fillRect(0, 1110, 1200, 90)
  context.fillStyle = color("--paper")
  context.font = "700 28px Montserrat, sans-serif"
  context.fillText("Datos que construyen democracia", 76, 1167)
  const link = document.createElement("a")
  link.download = `15-anos-de-tu-voto-${entity.code}.png`
  link.href = canvas.toDataURL("image/png")
  link.click()
}

function StateExplorer({ data }: { data: DashboardData }) {
  const sortedEntities = useMemo(
    () => [...data.entities].sort((left, right) => left.name.localeCompare(right.name, "es")),
    [data.entities],
  )
  const [selectedCode, setSelectedCode] = useState(sortedEntities[0]?.code ?? "")
  const [compareCode, setCompareCode] = useState(sortedEntities[1]?.code ?? "")
  const [entitySearch, setEntitySearch] = useState("")
  const [electionKind, setElectionKind] = useState<ElectionRecord["kind"]>("presidencial")
  const [year, setYear] = useState(2024)
  const [view, setView] = useState<"map" | "table">("map")
  const [mapRetry, setMapRetry] = useState(0)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const selected = sortedEntities.find(({ code }) => code === selectedCode) ?? sortedEntities[0]!
  const compared = sortedEntities.find(({ code }) => code === compareCode && code !== selected.code)
    ?? sortedEntities.find(({ code }) => code !== selected.code)
    ?? selected
  const electionOptions = elections.filter(({ kind }) => kind === electionKind)
  const national = recordForYear(data.national, year)
  const quartile = data.quartiles.find((record) => record.year === year)
  const sortedByParticipation = useMemo(
    () => sortedEntities
      .flatMap((entity) => {
        const value = recordForYear(entity.elections, year)?.value
        return value === null || value === undefined ? [] : [{ entity, value }]
      })
      .sort((left, right) => right.value - left.value),
    [sortedEntities, year],
  )
  const rankingIndex = sortedByParticipation.findIndex(({ entity }) => entity.code === selected.code)
  const selectedValue = recordForYear(selected.elections, year)?.value
  const ranking = selectedValue === null || selectedValue === undefined ? null : rankingIndex + 1
  const comparedValue = recordForYear(compared.elections, year)?.value
  const comparison =
    selectedValue !== null &&
    selectedValue !== undefined &&
    national?.value !== null &&
    national?.value !== undefined
      ? selectedValue - national.value
      : null
  const stateDifference =
    selectedValue !== null &&
    selectedValue !== undefined &&
    comparedValue !== null &&
    comparedValue !== undefined
      ? selectedValue - comparedValue
      : null
  const onSelect = useCallback((entity: EntityRecord) => {
    setSelectedCode(entity.code)
    setEntitySearch("")
    setCompareCode((current) =>
      current === entity.code
        ? sortedEntities.find(({ code }) => code !== entity.code)?.code ?? ""
        : current,
    )
  }, [sortedEntities])
  const changeElectionKind = (kind: ElectionRecord["kind"]) => {
    setElectionKind(kind)
    const available = elections.filter((election) => election.kind === kind)
    setYear(available[available.length - 1]!.year)
  }
  const entityOptions = entitySearch.trim()
    ? [
        selected,
        ...sortedEntities.filter(
          (entity) =>
            entity.code !== selected.code &&
            normalizeEntityName(entity.name).includes(normalizeEntityName(entitySearch)),
        ),
      ]
    : sortedEntities
  const handleDownload = async () => {
    try {
      setDownloadError(null)
      await drawDownloadCard(
        selected,
        recordForYear(selected.elections, year),
        year,
        ranking,
        comparison,
        national?.value ?? null,
        data.map.topologyAvailable,
        data.map.objectName,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo generar la ficha."
      setDownloadError(message)
      console.error("Error al generar la ficha PNG:", error)
    }
  }
  return (
    <section className="section" id="estados">
      <div className="container">
        <SectionHeading
          number="02"
          eyebrow="Tu territorio, tu historia"
          title={<>¿Cómo participa<br />tu estado?</>}
          description="Explora la participación por entidad y compara dos estados. El desglose estatal solo está disponible para 2024; en los demás años verás “Dato pendiente”."
        />
        <div className="explorer-controls">
          <div className="entity-picker">
            <label htmlFor="entity-search">Busca una entidad</label>
            <input
              id="entity-search"
              type="search"
              value={entitySearch}
              placeholder="Escribe el nombre"
              onChange={(event) => setEntitySearch(event.target.value)}
              aria-describedby="entity-search-help"
            />
            <span id="entity-search-help">Después, elige una opción de la lista.</span>
            <label htmlFor="entity-select">Entidad seleccionada</label>
            <select
              id="entity-select"
              value={selected.code}
              onChange={(event) =>
                onSelect(data.entities.find(({ code }) => code === event.target.value) ?? selected)
              }
            >
              {entityOptions.map((entity) => (
                <option key={entity.code} value={entity.code}>{entity.name}</option>
              ))}
            </select>
            {entitySearch.trim() &&
              !sortedEntities.some((entity) =>
                normalizeEntityName(entity.name).includes(normalizeEntityName(entitySearch)),
              ) && <span className="search-empty" role="status">No encontramos coincidencias.</span>}
          </div>
          <fieldset className="election-kind-control">
            <legend>Tipo de elección</legend>
            <div className="view-toggle">
              <button
                type="button"
                aria-pressed={electionKind === "presidencial"}
                className={electionKind === "presidencial" ? "active" : ""}
                onClick={() => changeElectionKind("presidencial")}
              >Presidenciales</button>
              <button
                type="button"
                aria-pressed={electionKind === "intermedia"}
                className={electionKind === "intermedia" ? "active" : ""}
                onClick={() => changeElectionKind("intermedia")}
              >Intermedias</button>
            </div>
          </fieldset>
          <label className="election-year-control" htmlFor="election-year-select">Elección</label>
          <select
            id="election-year-select"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          >
            {electionOptions.map((election) => (
              <option key={election.year} value={election.year}>{election.year}</option>
            ))}
          </select>
          <div className="view-toggle" role="group" aria-label="Vista de entidades">
            <button type="button" aria-pressed={view === "map"} className={view === "map" ? "active" : ""} onClick={() => setView("map")}>Mapa</button>
            <button type="button" aria-pressed={view === "table"} className={view === "table" ? "active" : ""} onClick={() => setView("table")}>Tabla</button>
          </div>
        </div>
        <p className="explorer-help">
          Este año actualiza el mapa o la tabla, la ficha, el ranking y la comparación. La participación por entidad solo tiene datos para 2024.
        </p>
        <div className="explorer-grid">
          <div className="map-panel">
            {view === "map" ? (
              <MexicoMap
                data={data}
                selected={selected}
                year={year}
                retryToken={mapRetry}
                onSelect={onSelect}
              />
            ) : (
              <StatesTable entities={sortedEntities} selected={selected} year={year} onSelect={onSelect} />
            )}
            {view === "map" && data.map.topologyAvailable && (
              <button className="map-retry" type="button" onClick={() => setMapRetry((value) => value + 1)}>Reintentar mapa</button>
            )}
            {view === "map" && <MapLegend records={sortedEntities} year={year} />}
            <section className="participation-ranking" aria-label={`Mayor y menor participación en ${year}`}>
              <h3>Mayor y menor participación · {year}</h3>
              {sortedByParticipation.length ? (
                <div className="ranking-options">
                  {[sortedByParticipation[0]!, sortedByParticipation[sortedByParticipation.length - 1]!].map(
                    ({ entity, value }, index) => (
                      <button
                        type="button"
                        key={entity.code}
                        className="ranking-option"
                        aria-label={`${index === 0 ? "Mayor" : "Menor"} participación: ${entity.name}, ${formatPercent(value)}`}
                        onClick={() => onSelect(entity)}
                      >
                        <span>{index === 0 ? "Mayor" : "Menor"} participación</span>
                        <strong>{entity.name}</strong>
                        <b>{formatPercent(value)}</b>
                      </button>
                    ),
                  )}
                </div>
              ) : (
                <p>Dato pendiente: la fuente no incluye participación estatal para {year}.</p>
              )}
            </section>
            <p className="chart-note">
              Muestra la participación por entidad para {year}. No muestra participación por edad, sexo o tipo de sección.
            </p>
          </div>
          <StateCard
            entity={selected}
            year={year}
            national={national}
            median={quartile?.median}
            ranking={ranking}
            onDownload={() => void handleDownload()}
          />
        </div>
        <section className="comparison-panel" aria-labelledby="comparison-title">
          <div className="comparison-heading">
            <div>
              <p className="eyebrow">Comparación directa</p>
              <h3 id="comparison-title">Dos entidades, lado a lado</h3>
            </div>
            <label htmlFor="compare-entity-select">Compara con otra entidad</label>
            <select
              id="compare-entity-select"
              value={compared.code}
              onChange={(event) => setCompareCode(event.target.value)}
            >
              {sortedEntities
                .filter(({ code }) => code !== selected.code)
                .map((entity) => (
                  <option key={entity.code} value={entity.code}>{entity.name}</option>
                ))}
            </select>
          </div>
          <div className="entity-comparison-grid">
            <EntityComparisonCard entity={selected} year={year} />
            <EntityComparisonCard entity={compared} year={year} />
          </div>
          <p className="comparison-difference" aria-live="polite">
            Diferencia entre ambas en {year}: {formatDifference(stateDifference)}.
          </p>
        </section>
        <SectionActions
          sectionId="estados"
          fileName={`participacion-estatal-${year}`}
          rows={sortedEntities.map((entity) => {
            const statistic = recordForYear(entity.elections, year)
            return {
              Entidad: entity.name,
              Clave: entity.code,
              Año: year,
              "Tipo de elección": electionKind === "presidencial" ? "Presidencial" : "Intermedia",
              "Participación (%)": statistic?.value ?? null,
              Precisión: statistic?.precision === "oficial"
                ? "Oficial"
                : statistic?.precision === "aproximado"
                  ? "Aproximado"
                  : null,
              "Sí votaron": statistic?.voters ?? null,
              "No votaron": statistic?.nonVoters ?? null,
              Fuente: statistic?.source ?? null,
            }
          })}
        />
        <div className="download-panel">
          <div>
            <p className="eyebrow">Ficha para compartir</p>
            <h3>Tu estado, en una imagen.</h3>
            <p>Imagen PNG cuadrada, generada localmente en tu navegador.</p>
            {downloadError && <p className="inline-error" role="alert">{downloadError}</p>}
          </div>
          <button className="button button-primary" onClick={() => void handleDownload()}>Descargar PNG</button>
        </div>
      </div>
    </section>
  )
}

function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [activeSection, setActiveSection] = useState("inicio")

  useEffect(() => {
    let active = true
    setLoadError(null)
    void loadDashboard()
      .then((loaded) => {
        if (active) setData(loaded)
      })
      .catch((error: unknown) => {
        if (active) {
          const message = error instanceof Error ? error.message : "Error al cargar los datos."
          setLoadError(message)
          console.error("Error al cargar datos locales:", error)
        }
      })
    return () => {
      active = false
    }
  }, [retry])

  useEffect(() => {
    if (!data) return
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [data])

  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>("main section[id], footer[id]")
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting)
        if (visible?.target.id) setActiveSection(visible.target.id)
      },
      { rootMargin: "-30% 0px -60% 0px" },
    )
    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [data, loadError])

  const retryLoad = useCallback(() => setRetry((current) => current + 1), [])
  return (
    <>
      <Header activeSection={activeSection} />
      {data ? (
        <>
          <main id="contenido">
            <Hero data={data} />
            <QuickQuestions />
            <NationalHistory data={data} />
            <StateExplorer data={data} />
            <Profiles records={data.profiles} national={data.national} />
            <DataSources />
            <section className="cta">
              <div className="container cta-inner">
                <div><p className="eyebrow">La democracia se construye</p><h2>Tu participación<br />también cuenta.</h2></div>
                <a className="button button-light" href="#origen-datos">Conoce las fuentes</a>
              </div>
            </section>
          </main>
          <Footer />
        </>
      ) : loadError ? (
        <main className="load-error" id="contenido" role="alert">
          <p className="eyebrow">Datos locales</p>
          <h1>No se pudieron cargar los datos.</h1>
          <p>{loadError}</p>
          <button className="button button-primary" onClick={retryLoad}>Reintentar</button>
        </main>
      ) : (
        <main id="contenido"><Skeleton /></main>
      )}
    </>
  )
}

export default function App() {
  const [boundaryKey, setBoundaryKey] = useState(0)
  return (
    <ErrorBoundary key={boundaryKey} onRetry={() => setBoundaryKey((key) => key + 1)}>
      <Dashboard />
    </ErrorBoundary>
  )
}
