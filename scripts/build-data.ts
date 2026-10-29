import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { elections } from "../src/data/elections"
import { entityNames } from "../src/data/entities"
import {
  dashboardSchema,
  differenceInputSchema,
  electionRecordSchema,
  entityRecordSchema,
  profileRecordSchema,
  quartileRecordSchema,
  validateElectionYears,
} from "../src/data/schemas"
import { calculateParticipation } from "../src/data/participation"
import { validateMapGeometry } from "../src/data/map-topology"
import type {
  DashboardData,
  ElectionRecord,
  EntityRecord,
  ProfileRecord,
  QuartileRecord,
} from "../src/data/types"

const root = process.cwd()
const sourceDirectory = path.join(root, "data-source")
const outputDirectory = path.join(root, "public", "data")
type InputRow = Record<string, unknown>

const sourceFiles = {
  national: "nacional.csv",
  entities: "entidades_2024.csv",
  lifeStages: "etapas_vida_composicion.csv",
  sectionTypes: "tipo_seccion_composicion.csv",
  quartiles: "cuartiles_estatales.csv",
  differences: "diferencias_entre_elecciones_entidad.csv",
} as const

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
}

function parseCsv(text: string, fileName: string): InputRow[] {
  const rows: string[][] = []
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) ?? ""
  const delimiter =
    firstLine.split(";").length > firstLine.split(",").length ? ";" : ","
  let row: string[] = []
  let cell = ""
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!
    if (character === '"' && quoted && text[index + 1] === '"') {
      cell += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === delimiter && !quoted) {
      row.push(cell)
      cell = ""
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1
      row.push(cell)
      if (row.some((value) => value.trim() !== "")) rows.push(row)
      row = []
      cell = ""
    } else {
      cell += character
    }
  }
  if (quoted) throw new Error(`${fileName}: campo CSV entrecomillado sin cerrar.`)
  if (cell || row.length) {
    row.push(cell)
    if (row.some((value) => value.trim() !== "")) rows.push(row)
  }

  const headers = rows.shift()?.map(normalizeHeader)
  if (!headers?.length || headers.some((header) => !header)) {
    throw new Error(`${fileName}: faltan encabezados CSV válidos.`)
  }
  return rows.map((cells, rowIndex) => {
    if (cells.length !== headers.length) {
      throw new Error(
        `${fileName}, fila ${rowIndex + 2}: se esperaban ${headers.length} columnas y llegaron ${cells.length}.`,
      )
    }
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]))
  })
}

async function loadCsv(fileName: string): Promise<InputRow[]> {
  const filePath = path.join(sourceDirectory, fileName)
  let contents: string
  try {
    contents = await readFile(filePath, "utf8")
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === "ENOENT") throw new Error(`Falta el archivo requerido data-source/${fileName}.`)
    throw error
  }
  return parseCsv(contents, fileName)
}

function text(value: unknown): string {
  return String(value ?? "").trim()
}

function numberValue(value: unknown, column: string): number
function numberValue(value: unknown, column: string, nullable: true): number | null
function numberValue(value: unknown, column: string, nullable = false): number | null {
  if (value === undefined || value === null || text(value) === "") {
    if (nullable) return null
    throw new Error(`Falta un valor requerido en la columna ${column}.`)
  }
  const parsed = Number(text(value).replace("%", "").replace(",", "."))
  if (!Number.isFinite(parsed)) {
    throw new Error(`Valor numérico inválido en la columna ${column}: ${String(value)}`)
  }
  return parsed
}

function electionKind(value: unknown): "presidencial" | "intermedia" {
  const normalized = text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  if (normalized === "presidencial") return "presidencial"
  if (normalized === "intermedia") return "intermedia"
  throw new Error(`Tipo de elección desconocido: ${text(value) || "(vacío)"}.`)
}

function expectedElection(year: number) {
  const expected = elections.find((election) => election.year === year)
  if (!expected) throw new Error(`Año no contemplado: ${year}.`)
  return expected
}

function precision(value: unknown, fileName: string): string {
  const normalized = text(value)
  if (!normalized) throw new Error(`${fileName}: falta la precisión de una fila.`)
  return normalized
}

function officialPrecision(value: unknown, fileName: string): "oficial" | "aproximado" {
  const normalized = text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  if (normalized !== "oficial" && normalized !== "aproximado") {
    throw new Error(`${fileName}: precisión inválida: ${text(value) || "(vacía)"}.`)
  }
  return normalized
}

function source(value: unknown, fileName: string): string {
  const result = text(value)
  if (!result) throw new Error(`${fileName}: falta la fuente de una fila.`)
  return result
}

function checkFormula(year: number, label: string, voters: number, nonVoters: number, official: number): void {
  const calculated = calculateParticipation(voters, nonVoters)
  if (calculated === null || Math.abs(calculated - official) > 0.06) {
    throw new Error(
      `${label}, ${year}: la fórmula produce ${calculated ?? "un valor inválido"} % y la fuente declara ${official} % (tolerancia 0.06 puntos).`,
    )
  }
}

function nationalRecords(rows: InputRow[]): ElectionRecord[] {
  const records = new Map<number, ElectionRecord>()
  for (const [index, row] of rows.entries()) {
    const year = numberValue(row.anio, "anio")
    if (year === null || !Number.isInteger(year)) throw new Error(`nacional.csv, fila ${index + 2}: año inválido.`)
    const expected = expectedElection(year)
    const kind = electionKind(row.tipo_eleccion)
    if (kind !== expected.kind) throw new Error(`${year} debe mantenerse como elección ${expected.kind}.`)
    if (records.has(year)) throw new Error(`nacional.csv: registro duplicado para ${year}.`)
    const voters = numberValue(row.si_votaron, "si_votaron", true)
    const nonVoters = numberValue(row.no_votaron, "no_votaron", true)
    const listNominal = numberValue(row.lista_nominal, "lista_nominal", true)
    const value = numberValue(row.participacion_pct, "participacion_pct")
    const averageAge = numberValue(row.edad_promedio_votantes, "edad_promedio_votantes", true)
    const recordPrecision = officialPrecision(row.precision, "nacional.csv")
    if (voters === null) throw new Error(`nacional.csv, ${year}: falta si_votaron.`)
    if (year === 2024 && (voters === null || nonVoters === null || listNominal === null)) {
      throw new Error("nacional.csv, 2024: faltan conteos o lista_nominal.")
    }
    if (year !== 2024 && (nonVoters !== null || listNominal !== null)) {
      throw new Error(`nacional.csv, ${year}: no_votaron y lista_nominal deben permanecer vacíos.`)
    }
    if (voters !== null && nonVoters !== null) checkFormula(year, "Nacional", voters, nonVoters, value)
    records.set(year, {
      value,
      source: source(row.fuente, "nacional.csv"),
      year,
      precision: recordPrecision,
      voters,
      nonVoters,
      averageAge,
      listNominal,
      kind,
    })
  }
  if (records.size !== elections.length) {
    throw new Error(`nacional.csv debe contener exactamente seis elecciones; contiene ${records.size}.`)
  }
  const ordered = elections.map(({ year }) => records.get(year)!)
  if (!validateElectionYears(ordered)) throw new Error("nacional.csv no contiene las seis elecciones esperadas.")
  if (ordered.find(({ year }) => year === 2024)?.value !== 59.7) {
    throw new Error(`nacional.csv: la participación oficial 2024 debe ser 59.7 %; se recibió ${ordered.find(({ year }) => year === 2024)?.value ?? "Dato pendiente"} %.`)
  }
  return ordered
}

function canonicalEntityName(name: string): string {
  return name === "México" ? "Estado de México" : name
}

function entityRecords(rows: InputRow[]): EntityRecord[] {
  const byCode = new Map<string, EntityRecord>()
  for (const [index, row] of rows.entries()) {
    const code = text(row.clave)
    const name = canonicalEntityName(text(row.entidad).normalize("NFC"))
    if (!entityNames.includes(name as (typeof entityNames)[number])) {
      throw new Error(`entidades_2024.csv, fila ${index + 2}: entidad desconocida o mal escrita: ${name || "(vacía)"}.`)
    }
    if (!code || byCode.has(code)) throw new Error(`entidades_2024.csv: clave vacía o duplicada: ${code || "(vacía)"}.`)
    const year = numberValue(row.anio, "anio")
    if (year !== 2024) throw new Error(`${name}: entidades_2024.csv solo admite el año 2024.`)
    const kind = electionKind(row.tipo_eleccion)
    if (kind !== "presidencial") throw new Error(`${name}: 2024 debe ser una elección presidencial.`)

    const voters = numberValue(row.si_votaron, "si_votaron")
    const nonVoters = numberValue(row.no_votaron, "no_votaron")
    const value = numberValue(row.participacion_pct, "participacion_pct")
    const listNominal = numberValue(row.lista_nominal, "lista_nominal")
    const votesNoEsp = numberValue(row.votos_no_esp, "votos_no_esp")
    const recordPrecision = officialPrecision(row.precision, "entidades_2024.csv")
    if (listNominal !== voters + nonVoters + votesNoEsp) {
      throw new Error(`${name}, 2024: lista_nominal no es igual a si_votaron + no_votaron + votos_no_esp.`)
    }
    checkFormula(2024, name, voters, nonVoters, value)

    byCode.set(code, {
      code,
      name,
      listNominal,
      votesNoEsp,
      votesNoEspPct: numberValue(row.votos_no_esp_pct, "votos_no_esp_pct"),
      iml: numberValue(row.iml, "IML", true),
      imv: numberValue(row.imv, "IMV", true),
      elections: [{
        value,
        source: source(row.fuente, "entidades_2024.csv"),
        year,
        precision: recordPrecision,
        voters,
        nonVoters,
        averageAge: null,
        listNominal,
        kind,
      }],
    })
  }
  if (byCode.size !== 32) {
    throw new Error(`entidades_2024.csv debe contener 32 entidades únicas; contiene ${byCode.size}.`)
  }
  const ordered = entityNames.map((name) => {
    const entity = [...byCode.values()].find((item) => item.name === name)
    if (!entity) throw new Error(`entidades_2024.csv: falta la entidad ${name}.`)
    return entity
  })
  return ordered
}

function compositionRecords(
  rows: InputRow[],
  dimension: ProfileRecord["dimension"],
  fileName: string,
): ProfileRecord[] {
  return rows.map((row, index) => {
    const year = numberValue(row.anio, "anio")
    if (year === null || !Number.isInteger(year)) throw new Error(`${fileName}, fila ${index + 2}: año inválido.`)
    const expected = expectedElection(year)
    const kind = electionKind(row.tipo_eleccion)
    if (kind !== expected.kind) throw new Error(`${fileName}, ${year}: tipo de elección incorrecto.`)
    const group = text(dimension === "etapa_vida" ? row.etapa_de_vida : row.tipo_seccion)
    if (!group) throw new Error(`${fileName}, fila ${index + 2}: falta el grupo de composición.`)
    return profileRecordSchema.parse({
      year,
      kind,
      dimension,
      group,
      value: numberValue(dimension === "etapa_vida" ? row.pct_de_votantes : row.pct_del_total_de_votantes, "porcentaje"),
      totalVoters: dimension === "etapa_vida" ? numberValue(row.total_votantes, "total_votantes", true) : null,
      precision: precision(row.precision, fileName),
      source: source(row.fuente, fileName),
    })
  })
}

function validateCompositionCoverage(
  records: ProfileRecord[],
  groupCount: number,
  fileName: string,
): void {
  let groupsForFirstYear: string[] | null = null
  for (const { year } of elections) {
    const groups = records.filter((record) => record.year === year).map(({ group }) => group)
    if (groups.length !== groupCount || new Set(groups).size !== groupCount) {
      throw new Error(`${fileName}: ${year} debe tener ${groupCount} grupos únicos; contiene ${groups.length}.`)
    }
    if (groupsForFirstYear === null) {
      groupsForFirstYear = groups.sort((left, right) => left.localeCompare(right, "es"))
    } else {
      const baseline = groupsForFirstYear
      if (
        baseline.some((group) => !groups.includes(group)) ||
        groups.some((group) => !baseline.includes(group))
      ) {
        throw new Error(`${fileName}: los grupos deben ser consistentes en las seis elecciones.`)
      }
    }
  }
}

function quartileRecords(rows: InputRow[]): QuartileRecord[] {
  const records = rows.map((row, index) => {
    const year = numberValue(row.anio, "anio")
    if (year === null || !Number.isInteger(year)) throw new Error(`cuartiles_estatales.csv, fila ${index + 2}: año inválido.`)
    const expected = expectedElection(year)
    const kind = electionKind(row.tipo_eleccion)
    if (kind !== expected.kind) throw new Error(`cuartiles_estatales.csv, ${year}: tipo de elección incorrecto.`)
    return quartileRecordSchema.parse({
      year,
      kind,
      maximum: numberValue(row.maximo, "maximo"),
      q3: numberValue(row.q3, "q3"),
      median: numberValue(row.mediana, "mediana"),
      q1: numberValue(row.q1, "q1"),
      minimum: numberValue(row.minimo, "minimo"),
      precision: precision(row.precision, "cuartiles_estatales.csv"),
      source: source(row.fuente, "cuartiles_estatales.csv"),
    })
  })
  if (!validateElectionYears(records)) {
    throw new Error("cuartiles_estatales.csv debe contener exactamente un registro por cada elección.")
  }
  return records
}

function validateDifferences(rows: InputRow[], entities: EntityRecord[]): void {
  const codes = new Set<string>()
  const knownEntities = new Map(entities.map(({ code, name }) => [code, name]))
  for (const [index, row] of rows.entries()) {
    const code = text(row.clave)
    if (!code || codes.has(code)) {
      throw new Error(`diferencias_entre_elecciones_entidad.csv, fila ${index + 2}: clave vacía o duplicada.`)
    }
    const entityName = canonicalEntityName(text(row.entidad).normalize("NFC"))
    if (knownEntities.get(code) !== entityName) {
      throw new Error(`diferencias_entre_elecciones_entidad.csv, fila ${index + 2}: clave y entidad no coinciden con la fuente estatal.`)
    }
    codes.add(code)
    differenceInputSchema.parse({
      code,
      entity: entityName,
      federal2015: numberValue(row.dif_2015_federal_pct, "dif_2015_federal_pct"),
      federal2021: numberValue(row.dif_2021_federal_pct, "dif_2021_federal_pct"),
      presidential2018: numberValue(row.dif_2018_presidencial_pct, "dif_2018_presidencial_pct"),
      presidential2024: numberValue(row.dif_2024_presidencial_pct, "dif_2024_presidencial_pct"),
      definition: text(row.estado_definicion),
      source: source(row.fuente, "diferencias_entre_elecciones_entidad.csv"),
    })
  }
  if (codes.size !== 32) {
    throw new Error(`diferencias_entre_elecciones_entidad.csv debe contener 32 entidades únicas; contiene ${codes.size}.`)
  }
  if ([...knownEntities.keys()].some((code) => !codes.has(code))) {
    throw new Error("diferencias_entre_elecciones_entidad.csv no corresponde a las mismas 32 entidades.")
  }
}

function validateEntityTotals(national: ElectionRecord[], entities: EntityRecord[]): void {
  const total = entities.reduce(
    (sum, entity) => {
      const current = entity.elections[0]!
      return {
        listNominal: sum.listNominal + (entity.listNominal ?? 0),
        voters: sum.voters + (current.voters ?? 0),
        nonVoters: sum.nonVoters + (current.nonVoters ?? 0),
      }
    },
    { listNominal: 0, voters: 0, nonVoters: 0 },
  )
  const national2024 = national.find(({ year }) => year === 2024)
  if (
    !national2024 ||
    national2024.listNominal === null ||
    total.listNominal !== national2024.listNominal ||
    total.voters !== national2024.voters ||
    total.nonVoters !== national2024.nonVoters
  ) {
    throw new Error(
      `Las sumas estatales 2024 no coinciden con nacional.csv (lista nominal ${total.listNominal}; sí votaron ${total.voters}; no votaron ${total.nonVoters}).`,
    )
  }
}

async function mapStatus(entities: EntityRecord[]): Promise<DashboardData["map"]> {
  const mapPath = path.join(sourceDirectory, "mexico.topo.json")
  let contents: string
  try {
    contents = await readFile(mapPath, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    await rm(path.join(outputDirectory, "mexico.topo.json"), { force: true })
    return {
      topologyAvailable: false,
      objectName: null,
      topologyError: "No se encontró data-source/mexico.topo.json.",
    }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    throw new Error("data-source/mexico.topo.json no contiene JSON válido.")
  }
  const objectName = validateMapGeometry(parsed, entities.map(({ code }) => code))
  await copyFile(mapPath, path.join(outputDirectory, "mexico.topo.json"))
  return { topologyAvailable: true, objectName, topologyError: null }
}

async function build(): Promise<void> {
  await mkdir(outputDirectory, { recursive: true })
  const nationalRows = await loadCsv(sourceFiles.national)
  const national = nationalRecords(nationalRows)
  const entities = entityRecords(await loadCsv(sourceFiles.entities))
  validateEntityTotals(national, entities)
  const lifeStages = compositionRecords(await loadCsv(sourceFiles.lifeStages), "etapa_vida", sourceFiles.lifeStages)
  const sectionTypes = compositionRecords(await loadCsv(sourceFiles.sectionTypes), "tipo_seccion", sourceFiles.sectionTypes)
  validateCompositionCoverage(lifeStages, 5, sourceFiles.lifeStages)
  validateCompositionCoverage(sectionTypes, 3, sourceFiles.sectionTypes)
  const profiles = [...lifeStages, ...sectionTypes]
  const quartiles = quartileRecords(await loadCsv(sourceFiles.quartiles))
  validateDifferences(await loadCsv(sourceFiles.differences), entities)
  const map = await mapStatus(entities)
  const dashboard: DashboardData = dashboardSchema.parse({ national, entities, profiles, quartiles, map })
  for (const entity of dashboard.entities) entityRecordSchema.parse(entity)
  dashboard.national.forEach((record) => electionRecordSchema.parse(record))
  dashboard.profiles.forEach((record) => profileRecordSchema.parse(record))

  await Promise.all([
    writeFile(path.join(outputDirectory, "national.json"), `${JSON.stringify(dashboard.national, null, 2)}\n`),
    writeFile(path.join(outputDirectory, "entities.json"), `${JSON.stringify(dashboard.entities, null, 2)}\n`),
    writeFile(path.join(outputDirectory, "profiles.json"), `${JSON.stringify(dashboard.profiles, null, 2)}\n`),
    writeFile(path.join(outputDirectory, "quartiles.json"), `${JSON.stringify(dashboard.quartiles, null, 2)}\n`),
    writeFile(path.join(outputDirectory, "map.json"), `${JSON.stringify(dashboard.map, null, 2)}\n`),
    writeFile(path.join(outputDirectory, "dashboard.json"), `${JSON.stringify(dashboard, null, 2)}\n`),
  ])
  console.info("Datos validados: seis elecciones, 32 entidades, sumas nacionales y fórmula verificadas.")
  console.info("La composición sociodemográfica y de sección se conserva como composición de votantes.")
  console.info("diferencias_entre_elecciones_entidad.csv se validó y no se publica en la interfaz.")
}

build().catch((error: unknown) => {
  console.error("No se pudieron construir los datos:", error)
  process.exitCode = 1
})
