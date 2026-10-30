import type { Statistic } from "../data/types"

export function formatPercent(value: number | null): string {
  return value === null
    ? "Dato pendiente"
    : `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(value)} %`
}

export function preciseLabel(statistic: Statistic): string {
  if (statistic.precision === "aproximado") return "Aproximado"
  if (statistic.precision === "oficial") return "Oficial"
  return "Dato pendiente"
}

export function Pending({
  compact = false,
  reason = "La fuente disponible todavía no incluye este dato.",
}: {
  compact?: boolean
  reason?: string
}) {
  return (
    <div className={`pending${compact ? " pending-compact" : ""}`} role="status">
      <span className="pending-pattern" aria-hidden="true" />
      <span>
        <strong>Dato pendiente</strong>
        <small>{reason}</small>
      </span>
    </div>
  )
}

export function PrecisionChip({ statistic }: { statistic: Statistic }) {
  if (!statistic.precision) return <span className="precision-chip">Dato pendiente</span>
  return (
    <span className={`precision-chip ${statistic.precision}`}>
      {statistic.precision === "aproximado" && "Aproximado"}
      {statistic.precision === "oficial" && "Oficial"}
    </span>
  )
}
