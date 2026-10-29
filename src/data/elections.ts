export type ElectionKind = "presidencial" | "intermedia"

export const elections = [
  { year: 2009, kind: "intermedia" },
  { year: 2012, kind: "presidencial" },
  { year: 2015, kind: "intermedia" },
  { year: 2018, kind: "presidencial" },
  { year: 2021, kind: "intermedia" },
  { year: 2024, kind: "presidencial" },
] as const
