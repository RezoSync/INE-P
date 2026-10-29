import type { ElectionKind } from "./elections"

export type Precision = "oficial" | "aproximado"

export type Statistic = {
  value: number | null
  source: string | null
  year: number
  precision: Precision | null
  voters: number | null
  nonVoters: number | null
}

export type ElectionRecord = Statistic & {
  kind: ElectionKind
  averageAge: number | null
  listNominal: number | null
}

export type EntityRecord = {
  code: string
  name: string
  elections: ElectionRecord[]
  listNominal: number | null
  votesNoEsp: number | null
  votesNoEspPct: number | null
  iml: number | null
  imv: number | null
}

export type ProfileRecord = {
  year: number
  kind: ElectionKind
  dimension: "etapa_vida" | "tipo_seccion"
  group: string
  value: number
  totalVoters: number | null
  precision: string | null
  source: string
}

export type QuartileRecord = {
  year: number
  kind: ElectionKind
  maximum: number
  q3: number
  median: number
  q1: number
  minimum: number
  precision: string
  source: string
}

export type DashboardData = {
  national: ElectionRecord[]
  entities: EntityRecord[]
  profiles: ProfileRecord[]
  quartiles: QuartileRecord[]
  map: {
    topologyAvailable: boolean
    objectName: string | null
    topologyError: string | null
  }
}
