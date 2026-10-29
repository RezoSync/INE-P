import { readFile } from "node:fs/promises"
import path from "node:path"
import { elections } from "../src/data/elections"
import { hasAllKnownEntities, dashboardSchema, validateElectionYears } from "../src/data/schemas"
import { matchesParticipation } from "../src/data/participation"
import type { DashboardData } from "../src/data/types"

async function validate(): Promise<void> {
  const file = path.join(process.cwd(), "public", "data", "dashboard.json")
  const raw: unknown = JSON.parse(await readFile(file, "utf8"))
  const data = dashboardSchema.parse(raw) as DashboardData
  const names = data.entities.map(({ name }) => name)
  if (!hasAllKnownEntities(names)) throw new Error("No están presentes las 32 entidades únicas.")
  if (!validateElectionYears(data.national) || !validateElectionYears(data.quartiles)) {
    throw new Error("Los seis procesos deben conservar su tipo electoral en las series nacionales y de cuartiles.")
  }
  if (elections.length !== 6) throw new Error("Se esperaban exactamente seis elecciones.")

  const national2024 = data.national.find(({ year }) => year === 2024)
  if (!national2024 || national2024.value !== 59.7) {
    throw new Error(`La participación nacional 2024 debe ser 59.7 %; se recibió ${national2024?.value ?? "Dato pendiente"} %.`)
  }
  const totals = data.entities.reduce(
    (sum, entity) => {
      const record = entity.elections[0]!
      if (
        entity.listNominal === null ||
        record.voters === null ||
        record.nonVoters === null ||
        entity.votesNoEsp === null
      ) {
        throw new Error(`${entity.name}: faltan conteos necesarios para verificar las sumas estatales.`)
      }
      if (entity.listNominal !== record.voters + record.nonVoters + entity.votesNoEsp) {
        throw new Error(`${entity.name}: lista nominal no coincide con la suma de conteos.`)
      }
      return {
        listNominal: sum.listNominal + entity.listNominal,
        voters: sum.voters + record.voters,
        nonVoters: sum.nonVoters + record.nonVoters,
      }
    },
    { listNominal: 0, voters: 0, nonVoters: 0 },
  )
  if (
    totals.listNominal !== national2024.listNominal ||
    totals.voters !== national2024.voters ||
    totals.nonVoters !== national2024.nonVoters
  ) {
    throw new Error("La suma de las entidades 2024 no coincide con los totales nacionales.")
  }

  for (const entity of data.entities) {
    const record = entity.elections[0]!
    if (
      record.voters === null ||
      record.nonVoters === null ||
      record.value === null ||
      !matchesParticipation(record.voters, record.nonVoters, record.value, 1, 0.06)
    ) {
      throw new Error(`${entity.name}: la fórmula no reproduce el porcentaje oficial (tolerancia 0.06 puntos).`)
    }
  }
  if (
    national2024.voters === null ||
    national2024.nonVoters === null ||
    !matchesParticipation(national2024.voters, national2024.nonVoters, national2024.value!, 1, 0.06)
  ) {
    throw new Error("La fórmula no reproduce la participación nacional 2024 (tolerancia 0.06 puntos).")
  }

  const presidential = data.national.filter(({ kind }) => kind === "presidencial")
  const intermediate = data.national.filter(({ kind }) => kind === "intermedia")
  if (presidential.length !== 3 || intermediate.length !== 3) {
    throw new Error("Las series presidenciales e intermedias deben estar separadas.")
  }
  console.info("Datos válidos: 32 entidades, seis elecciones, nacional 2024 = 59.7 %, sumas estatales y fórmula revisadas.")
}

validate().catch((error: unknown) => {
  console.error("La validación de datos falló:", error)
  process.exitCode = 1
})
