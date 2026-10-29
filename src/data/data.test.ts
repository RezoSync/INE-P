import { readFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { elections } from "./elections"
import { entityNames } from "./entities"
import { createMapRanges, getMapBucket } from "./map-scale"
import { calculateParticipation, matchesParticipation } from "./participation"
import { validateMapGeometry } from "./map-topology"
import { dashboardSchema, hasAllKnownEntities, validateElectionYears } from "./schemas"
import type { DashboardData } from "./types"

describe("participation methodology", () => {
  it("uses only voters divided by voters plus non-voters", () => {
    expect(calculateParticipation(597, 403)).toBe(59.7)
  })

  it("rejects invalid counts and empty totals", () => {
    expect(calculateParticipation(0, 0)).toBeNull()
    expect(calculateParticipation(-1, 2)).toBeNull()
    expect(calculateParticipation(Number.NaN, 2)).toBeNull()
  })

  it("checks official values within tolerance without replacing them", () => {
    expect(matchesParticipation(597, 403, 59.7, 1, 0.06)).toBe(true)
    expect(matchesParticipation(597, 403, 59.8, 1, 0.06)).toBe(false)
  })
})

describe("validated dashboard data", () => {
  it("contains 32 unique entities", () => {
    expect(entityNames).toHaveLength(32)
    expect(new Set(entityNames).size).toBe(32)
    expect(hasAllKnownEntities([...entityNames])).toBe(true)
  })

  it("keeps presidential and intermediate processes separate", () => {
    const records = elections.map(({ year, kind }) => ({ year, kind }))
    expect(validateElectionYears(records)).toBe(true)
    expect(records.filter(({ kind }) => kind === "presidencial")).toHaveLength(3)
    expect(records.filter(({ kind }) => kind === "intermedia")).toHaveLength(3)
    expect(validateElectionYears(records.map((record) =>
      record.year === 2024 ? { ...record, kind: "intermedia" } : record,
    ))).toBe(false)
  })

  it("rejects unordered quartiles", () => {
    const dashboard = {
      national: [],
      entities: [],
      profiles: [],
      quartiles: [{
        year: 2024,
        kind: "presidencial",
        maximum: 70,
        q3: 60,
        median: 65,
        q1: 55,
        minimum: 47,
        precision: "oficial",
        source: "INE",
      }],
      map: { topologyAvailable: false, objectName: null },
    }
    expect(dashboardSchema.safeParse(dashboard).success).toBe(false)
  })

  it("validates real national, state, and composition data", async () => {
    const data = dashboardSchema.parse(
      JSON.parse(await readFile(path.join(process.cwd(), "public", "data", "dashboard.json"), "utf8")),
    ) as DashboardData
    const national2024 = data.national.find(({ year }) => year === 2024)
    expect(data.national).toHaveLength(6)
    expect(national2024?.value).toBe(59.7)
    expect(data.entities).toHaveLength(32)
    expect(data.profiles.some(({ dimension }) => dimension === "etapa_vida")).toBe(true)
    expect(data.profiles.some(({ dimension }) => dimension === "tipo_seccion")).toBe(true)
    const totals = data.entities.reduce(
      (sum, entity) => ({
        voters: sum.voters + entity.elections[0]!.voters!,
        nonVoters: sum.nonVoters + entity.elections[0]!.nonVoters!,
        listNominal: sum.listNominal + entity.listNominal!,
      }),
      { voters: 0, nonVoters: 0, listNominal: 0 },
    )
    expect(totals.voters).toBe(national2024?.voters)
    expect(totals.nonVoters).toBe(national2024?.nonVoters)
    expect(totals.listNominal).toBe(national2024?.listNominal)
    expect(national2024?.voters).not.toBeNull()
    expect(national2024?.nonVoters).not.toBeNull()
    expect(matchesParticipation(
      national2024!.voters!,
      national2024!.nonVoters!,
      national2024!.value!,
      1,
      0.06,
    )).toBe(true)
    expect(data.entities.every((entity) =>
      entity.listNominal === entity.elections[0]!.voters! + entity.elections[0]!.nonVoters! + entity.votesNoEsp! &&
      matchesParticipation(
        entity.elections[0]!.voters!,
        entity.elections[0]!.nonVoters!,
        entity.elections[0]!.value!,
        1,
        0.06,
      ),
    )).toBe(true)
    expect(data.quartiles).toHaveLength(6)
    expect(data.quartiles.every(({ minimum, q1, median, q3, maximum }) =>
      minimum <= q1 && q1 <= median && median <= q3 && q3 <= maximum,
    )).toBe(true)
  })
})

describe("map scale", () => {
  it("validates the 32 unique map keys against the published state entities", async () => {
    const data = dashboardSchema.parse(
      JSON.parse(await readFile(path.join(process.cwd(), "public", "data", "dashboard.json"), "utf8")),
    ) as DashboardData
    const topology: unknown = JSON.parse(
      await readFile(path.join(process.cwd(), "public", "data", "mexico.topo.json"), "utf8"),
    )
    expect(data.map.topologyAvailable).toBe(true)
    expect(data.map.objectName).toBe("entidades")
    expect(validateMapGeometry(topology, data.entities.map(({ code }) => code))).toBe("entidades")
    const mapKeys = (topology as {
      objects: { entidades: { geometries: Array<{ properties: { clave: string } }> } }
    }).objects.entidades.geometries.map(({ properties }) => properties.clave)
    expect(new Set(mapKeys).size).toBe(32)
    expect(mapKeys.every((code) => data.entities.some((entity) => entity.code === code))).toBe(true)
  })

  it("derives four ordered ranges spanning the actual 2024 minimum and maximum", async () => {
    const data = dashboardSchema.parse(
      JSON.parse(await readFile(path.join(process.cwd(), "public", "data", "dashboard.json"), "utf8")),
    ) as DashboardData
    const values = data.entities.map(({ elections: records }) => records[0]!.value!)
    const ranges = createMapRanges(values)
    expect(ranges).toHaveLength(4)
    expect(ranges[0]?.min).toBe(47)
    expect(ranges[3]?.max).toBe(71.4)
    expect(getMapBucket(47, ranges)).toBe(0)
    expect(getMapBucket(71.4, ranges)).toBe(3)
    expect(ranges.every((range, index) => index === 0 || range.min >= ranges[index - 1]!.min)).toBe(true)
  })

  it("has no fabricated ranges when there are no values", () => {
    expect(createMapRanges([])).toEqual([])
  })
})
