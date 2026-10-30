import { describe, expect, it } from "vitest"
import { csvCell, toCsv } from "./csv"

describe("descarga CSV", () => {
  it("conserva los valores nulos como celdas vacías, sin inventar datos", () => {
    expect(csvCell(null)).toBe("")
    expect(toCsv([{ Año: 2024, "Participación (%)": null }])).toBe('"Año","Participación (%)"\r\n"2024",')
  })

  it("escapa comillas y comas dentro del texto", () => {
    expect(csvCell('Plataforma "CCPC", INE')).toBe('"Plataforma ""CCPC"", INE"')
  })

  it("neutraliza textos que parecerían fórmulas de hoja de cálculo", () => {
    expect(csvCell("=SUMA(A1:A2)")).toBe(`"'=SUMA(A1:A2)"`)
    expect(csvCell("+52 55")).toBe(`"'+52 55"`)
    expect(csvCell("@usuario")).toBe(`"'@usuario"`)
  })

  it("no altera los números negativos", () => {
    expect(csvCell(-1.5)).toBe('"-1.5"')
  })

  it("devuelve texto vacío cuando no hay filas", () => {
    expect(toCsv([])).toBe("")
  })

  it("usa la primera fila como encabezado y separa filas con salto de línea de Windows", () => {
    const csv = toCsv([
      { Entidad: "Sonora", Año: 2024 },
      { Entidad: "Yucatán", Año: 2024 },
    ])
    expect(csv.split("\r\n")).toEqual(['"Entidad","Año"', '"Sonora","2024"', '"Yucatán","2024"'])
  })
})
