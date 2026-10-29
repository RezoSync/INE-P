export function validateMapGeometry(topology: unknown, expectedCodes: string[]): string {
  if (
    !topology ||
    typeof topology !== "object" ||
    !("type" in topology) ||
    topology.type !== "Topology" ||
    !("objects" in topology) ||
    !topology.objects ||
    typeof topology.objects !== "object"
  ) {
    throw new Error("data-source/mexico.topo.json debe ser un TopoJSON válido.")
  }

  const objectName = Object.keys(topology.objects).find((name) => {
    const object = (topology.objects as Record<string, unknown>)[name]
    return (
      object !== null &&
      typeof object === "object" &&
      "type" in object &&
      object.type === "GeometryCollection"
    )
  })
  if (!objectName) {
    throw new Error('data-source/mexico.topo.json debe contener un objeto GeometryCollection llamado "entidades".')
  }
  if (objectName !== "entidades") {
    throw new Error(`Se esperaba el objeto TopoJSON "entidades"; se encontró "${objectName}".`)
  }

  const object = (topology.objects as Record<string, unknown>)[objectName]
  if (
    !object ||
    typeof object !== "object" ||
    !("geometries" in object) ||
    !Array.isArray(object.geometries)
  ) {
    throw new Error('El objeto TopoJSON "entidades" debe contener geometrías.')
  }
  if (object.geometries.length !== expectedCodes.length) {
    throw new Error(
      `TopoJSON "entidades": se esperaban ${expectedCodes.length} geometrías; contiene ${object.geometries.length}.`,
    )
  }

  const keys = object.geometries.map((geometry: unknown, index: number) => {
    if (
      !geometry ||
      typeof geometry !== "object" ||
      !("type" in geometry) ||
      (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") ||
      !("properties" in geometry) ||
      !geometry.properties ||
      typeof geometry.properties !== "object" ||
      !("clave" in geometry.properties) ||
      typeof geometry.properties.clave !== "string" ||
      !geometry.properties.clave.trim()
    ) {
      throw new Error(
        `TopoJSON "entidades", geometría ${index + 1}: se requiere Polygon/MultiPolygon con propiedad clave.`,
      )
    }
    return geometry.properties.clave.trim()
  })

  if (new Set(keys).size !== expectedCodes.length) {
    throw new Error('TopoJSON "entidades": las 32 claves deben ser únicas.')
  }
  const expected = new Set(expectedCodes)
  const unexpected = keys.filter((key) => !expected.has(key))
  const missing = expectedCodes.filter((key) => !keys.includes(key))
  if (unexpected.length || missing.length) {
    throw new Error(
      `TopoJSON "entidades": claves sin correspondencia en entidades_2024.csv (extra: ${unexpected.join(", ") || "ninguna"}; faltantes: ${missing.join(", ") || "ninguna"}).`,
    )
  }
  return objectName
}
