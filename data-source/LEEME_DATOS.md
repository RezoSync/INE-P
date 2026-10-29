# data-source: datos reales CCPC 2009-2024 (INE)

Transcritos de tres capturas PDF del tablero oficial (Plataforma CCPC): Datos generales, Datos comparativos y Datos sociodemográficos.

## Archivos
| Archivo | Contenido | Cobertura |
|---|---|---|
| nacional.csv | % participación, votantes (sí votaron), edad promedio | 6 elecciones (2009-2024). no_votaron y lista_nominal solo en 2024 |
| entidades_2024.csv | 32 entidades: lista nominal, sí/no votaron, % participación, % abstención, votos no esp., IML, IMV | Solo 2024 |
| etapas_vida_composicion.csv | % de los votantes por etapa de vida | 6 elecciones |
| tipo_seccion_composicion.csv | % del total de votantes por tipo de sección (urbana, rural, mixta) | 6 elecciones |
| cuartiles_estatales.csv | máximo, Q3, mediana, Q1, mínimo de la participación entre entidades | 6 elecciones |
| diferencias_entre_elecciones_entidad.csv | diferencias porcentuales por entidad. DEFINICIÓN NO CONFIRMADA: no mostrar en la web | 2015, 2018, 2021, 2024 |
| mexico.topo.json | TopoJSON público generalizado, objeto `entidades`, con 32 geometrías y propiedades `clave` y `nombre` | Las 32 claves coinciden con `entidades_2024.csv`; puede sustituirse por el Marco Geoestadístico del INEGI conservando el objeto y esas propiedades |

## Verificaciones hechas
- Las 32 entidades suman exactamente los totales nacionales de 2024 (lista nominal 98,330,348; sí votaron 54,899,228; no votaron 37,105,466; votos no esp. 6,325,654).
- participación = sí votaron / (sí votaron + no votaron) reproduce el % oficial de cada entidad (tolerancia 0.06 pts) y el nacional (59.67 % ≈ 59.7 %).
- lista nominal = sí votaron + no votaron + votos no esp. en las 32 entidades.
- La mediana de las 32 entidades (58.55) coincide con la mediana del tablero (58.5).

## Lo que NO está (se queda como "Dato pendiente")
- Participación por entidad en 2009-2021 (el PDF solo muestra 2024; el tablero tiene un selector de años).
- Participación por grupo quinquenal de edad y por sexo (el tablero la muestra en una gráfica de puntos sin valores).
- Participación por tipo de sección: los datos disponibles son composición (qué % de los votantes vive en cada tipo), NO tasa de participación.
- Etapas de vida: igual, composición de los votantes, no tasa de participación.
- no_votaron nacional de 2009-2021.
- Significado de IML e IMV: conservar las siglas tal cual; no definir hasta confirmar en la fuente.

El importador valida `diferencias_entre_elecciones_entidad.csv`, pero no lo incorpora a los JSON del tablero. Los campos vacíos de los CSV se conservan como `null`.
