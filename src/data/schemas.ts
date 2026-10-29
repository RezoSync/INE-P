import { z } from "zod"
import { elections } from "./elections"
import { entityNames } from "./entities"

const nullableCount = z.number().int().nonnegative().nullable()
const nullablePercent = z.number().min(0).max(100).nullable()
const yearSchema = z.number().int().min(2000).max(2100)
const kindSchema = z.enum(["presidencial", "intermedia"])

export const statisticSchema = z.object({
  value: nullablePercent,
  source: z.string().min(1).nullable(),
  year: yearSchema,
  precision: z.enum(["oficial", "aproximado"]).nullable(),
  voters: nullableCount,
  nonVoters: nullableCount,
})

export const electionRecordSchema = statisticSchema.extend({
  kind: kindSchema,
  averageAge: z.number().min(0).max(120).nullable(),
  listNominal: nullableCount,
})

export const entityRecordSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  elections: z.array(electionRecordSchema).length(1),
  listNominal: nullableCount,
  votesNoEsp: nullableCount,
  votesNoEspPct: nullablePercent,
  iml: z.number().nullable(),
  imv: z.number().nullable(),
})

export const profileRecordSchema = z.object({
  year: yearSchema,
  kind: kindSchema,
  dimension: z.enum(["etapa_vida", "tipo_seccion"]),
  group: z.string().min(1),
  value: z.number().min(0).max(100),
  totalVoters: nullableCount,
  precision: z.string().min(1),
  source: z.string().min(1),
})

export const quartileRecordSchema = z.object({
  year: yearSchema,
  kind: kindSchema,
  maximum: z.number().min(0).max(100),
  q3: z.number().min(0).max(100),
  median: z.number().min(0).max(100),
  q1: z.number().min(0).max(100),
  minimum: z.number().min(0).max(100),
  precision: z.string().min(1),
  source: z.string().min(1),
}).refine(
  ({ minimum, q1, median, q3, maximum }) =>
    minimum <= q1 && q1 <= median && median <= q3 && q3 <= maximum,
  { message: "Los cuartiles deben estar ordenados de mínimo a máximo." },
)

export const differenceInputSchema = z.object({
  code: z.string().min(1),
  entity: z.string().min(1),
  federal2015: z.number(),
  federal2021: z.number(),
  presidential2018: z.number(),
  presidential2024: z.number(),
  definition: z.string().min(1),
  source: z.string().min(1),
}).strict()

export const dashboardSchema = z.object({
  national: z.array(electionRecordSchema).length(6),
  entities: z
    .array(entityRecordSchema)
    .length(32)
    .refine((entities) => new Set(entities.map(({ code }) => code)).size === 32, {
      message: "Las claves de las 32 entidades deben ser únicas.",
    })
    .refine(
      (entities) =>
        new Set(entities.map(({ name }) => name.normalize("NFC"))).size === 32,
      { message: "Los nombres de las 32 entidades deben ser únicos." },
    ),
  profiles: z.array(profileRecordSchema),
  quartiles: z.array(quartileRecordSchema).length(6),
  map: z.object({
    topologyAvailable: z.boolean(),
    objectName: z.string().min(1).nullable(),
    topologyError: z.string().min(1).nullable(),
  }),
})

export function validateElectionYears(
  records: Array<{ year: number; kind: string }>,
): boolean {
  return (
    records.length === elections.length &&
    new Set(records.map(({ year }) => year)).size === elections.length &&
    elections.every(({ year, kind }) =>
      records.some((record) => record.year === year && record.kind === kind),
    )
  )
}

export function hasAllKnownEntities(names: string[]): boolean {
  return (
    names.length === entityNames.length &&
    new Set(names).size === entityNames.length &&
    entityNames.every((name) => names.includes(name))
  )
}
