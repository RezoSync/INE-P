# Contexto del proyecto

## Propósito y límites

Aplicación estática React + Vite + TypeScript para presentar participación electoral en México durante seis procesos de 2009–2024. Las fuentes agregadas provienen de los CSV transcritos de la Plataforma CCPC del INE, descritos en `data-source/LEEME_DATOS.md`.

No inventar, estimar, interpolar ni completar vacíos. Los valores ausentes se guardan como `null` y se muestran como “Dato pendiente”. El porcentaje oficial se conserva como se recibió. La fórmula, implementada exclusivamente en `src/data/participation.ts`, solo verifica `sí votaron / (sí votaron + no votaron)` con tolerancia de 0.06 puntos; nunca usa lista nominal como denominador.

## Datos disponibles

- `nacional.csv`: seis elecciones, participación oficial, votantes y edad promedio. El conteo de no votantes y la lista nominal solo están disponibles para 2024.
- `entidades_2024.csv`: 32 entidades, únicamente para 2024, con lista nominal, conteos, porcentaje, votos no especificados, IML e IMV. La suma estatal debe coincidir con el dato nacional y cada lista nominal con la suma de sus conteos.
- `etapas_vida_composicion.csv` y `tipo_seccion_composicion.csv`: composición del total de votantes, no participación desagregada.
- `cuartiles_estatales.csv`: mínimo, Q1, mediana, Q3 y máximo de las seis elecciones.
- `diferencias_entre_elecciones_entidad.csv`: validar al importar, pero no mostrar hasta que se confirme la definición de la métrica.
- `mexico.topo.json`: TopoJSON público generalizado, objeto `entidades`, con 32 geometrías y propiedades `clave` y `nombre`. El importador comprueba claves únicas y correspondencia exacta con las 32 claves de `entidades_2024.csv`. Puede sustituirse por el Marco Geoestadístico del INEGI conservando el objeto y esas propiedades.

Las presidenciales (2012, 2018, 2024) y las intermedias (2009, 2015, 2021) se mantienen en series separadas. Participación estatal antes de 2024, desgloses de participación por edad/sexo/sección y no votantes nacionales antes de 2024 no están disponibles. No asignar significado a IML o IMV; mostrar solo siglas y valores hasta confirmación.

## Importar y validar

`npm run build:data` lee exclusivamente los CSV esperados en `data-source/`, valida columnas, valores y registros con Zod, verifica los seis procesos, las 32 entidades, totales nacionales, identidad de lista nominal y fórmula. Valida además las filas del archivo de diferencias sin copiarlas a la interfaz. Genera JSON derivado en `public/data/`; no editar esos resultados manualmente.

`npm run validate:data` verifica la salida generada, la cifra nacional 2024 (59.7 %), sumas, fórmula y separación de elecciones. Si se agregan periodos o dimensiones, actualizar tipos, esquemas, importador, accesibilidad y pruebas en el mismo cambio. No inferir cobertura nueva a partir de series incompletas.

## Arquitectura

- `src/App.tsx`: carga local, estados de error/carga, mapa local TopoJSON con D3, selección sincronizada por clave, estado 2024 y ficha descargable.
- `src/components/`: historia, navegación, perfiles y visualizaciones.
- `src/data/`: tipos, esquemas Zod, elecciones y fórmula.
- `scripts/`: importador y validador reproducibles.
- `public/data/`: salida JSON regenerable.
- `tests/`: Vitest y Playwright.

## Privacidad, accesibilidad y seguridad

No añadir solicitudes a terceros, recursos remotos, cookies ni analítica. Respetar CSP y encabezados documentados en `docs/SEGURIDAD.md`. Mantener tablas accesibles, navegación por teclado, foco visible, contraste AA, reducción de movimiento y diseño sin desplazamiento horizontal en anchos menores a 1180 px.

Comandos de validación de entrega:

```sh
npm run build:data
npm run validate:data
npm run check
npm run build
npm run test:e2e
npm run audit
```
