# 15 años de tu voto

Tablero estático de participación electoral en México para seis elecciones de 2009 a 2024. Las cifras se toman de los CSV locales transcritos de la Plataforma CCPC del INE; no se estiman valores ni se sustituyen porcentajes oficiales.

## Requisitos

- Node.js 22
- npm

## Datos disponibles

Los archivos fuente y sus metadatos están en `data-source/`:

| Archivo | Datos |
|---|---|
| `nacional.csv` | Participación oficial, personas que sí votaron y edad promedio para las seis elecciones. `no_votaron` y `lista_nominal` solo están disponibles en 2024. |
| `entidades_2024.csv` | Conteos y participación oficial de las 32 entidades en 2024; incluye votos no especificados, IML e IMV. |
| `etapas_vida_composicion.csv` | Porcentaje del total de votantes por etapa de vida y elección. Es composición, no participación del grupo. |
| `tipo_seccion_composicion.csv` | Porcentaje del total de votantes por tipo de sección y elección. Es composición, no participación de la sección. |
| `cuartiles_estatales.csv` | Máximo, Q3, mediana, Q1 y mínimo estatal para las seis elecciones. |
| `diferencias_entre_elecciones_entidad.csv` | Se importa y valida, pero no se publica ni se muestra: su definición está pendiente de confirmación. |
| `mexico.topo.json` | TopoJSON público generalizado, objeto `entidades`, con 32 geometrías y propiedades `clave` y `nombre`. El importador comprueba que las claves únicas coincidan con `entidades_2024.csv`. |

Fuente documentada en los CSV: Plataforma CCPC 2009–2024, INE (tableros Datos generales, Datos comparativos y Datos sociodemográficos). Los archivos vacíos se convierten en `null`. IML e IMV se muestran únicamente como siglas y valores, sin expandir sus nombres.

## Metodología y límites

- Participación = sí votaron / (sí votaron + no votaron) × 100. La lista nominal nunca es denominador.
- El porcentaje oficial se conserva; la fórmula de `src/data/participation.ts` se usa solo para verificarlo con tolerancia de 0.06 puntos.
- Las series presidenciales (2012, 2018, 2024) y las intermedias (2009, 2015, 2021) se mantienen separadas.
- La composición por etapa de vida y sección no es una tasa de participación.
- No se dispone de participación estatal antes de 2024 ni de participación desagregada por edad, sexo o tipo de sección. Se presenta como “Dato pendiente”.
- No se solicitan recursos remotos ni se usan cookies o analítica. Las fuentes tipográficas están empaquetadas localmente; respeta la CSP de `index.html` y `docs/SEGURIDAD.md`.

## Construir, validar y probar

```sh
npm install
npm run build:data
npm run validate:data
npm run check
npm run build
npm run test:e2e
npm run audit
npm run preview
```

`npm run build:data` valida los CSV con Zod y genera JSON en `public/data/`. Falla con un mensaje explícito si faltan elecciones, entidades, columnas o si no coinciden los totales, la lista nominal o la fórmula. También valida los seis rangos de cuartiles y el CSV de diferencias, que no aparece en la interfaz. El estado del mapa queda explícitamente pendiente si no hay geometría TopoJSON válida.

## Agregar datos

1. Obtén y documenta los valores desde la fuente oficial; no rellenes vacíos con cálculos o estimaciones.
2. Mantén los nombres y encabezados exactos de los CSV de la tabla anterior; las columnas vacías deben permanecer vacías.
3. Para incorporar nuevos desgloses, confirma primero que sean tasas de participación o composición y documenta esa diferencia en el esquema, la interfaz y las pruebas.
4. Antes de añadir años de participación estatal, consigue datos fuente para esas elecciones y amplía explícitamente las validaciones.
5. El mapa usa geometría TopoJSON público generalizado. Puede sustituirse por el Marco Geoestadístico del INEGI conservando el objeto `entidades` y las propiedades `clave` y `nombre`; las 32 claves deben coincidir con `entidades_2024.csv`. No uses cartografía remota.
6. Ejecuta todos los comandos de construcción y validación anteriores.

## Estructura

- `src/App.tsx`, `src/components/`: navegación, exploración estatal, ficha PNG y visualizaciones.
- `src/data/`: tipos, Zod, fórmula única y escala del mapa.
- `scripts/build-data.ts`: importación de CSV y generación reproducible.
- `scripts/validate-data.ts`: validaciones de los datos generados.
- `public/data/`: JSON derivado y regenerable.
- `tests/`: Vitest y Playwright.
