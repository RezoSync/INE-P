# Seguridad

## Política de recursos

La aplicación es estática y no necesita conectividad con terceros. No agregar píxeles, analítica, cookies, fuentes remotas ni CDN. Montserrat y Noto Sans se empaquetan desde `@fontsource`; el JSON de participación y el TopoJSON se sirven desde el mismo origen.

El documento aplica esta política para recursos del sitio:

```text
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
font-src 'self';
img-src 'self' data:;
connect-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self'
```

En producción, configúrese además como encabezado HTTP `Content-Security-Policy` y añádase `frame-ancestors 'none'` en el encabezado HTTP (no en una etiqueta `meta`). `unsafe-inline` en `style-src` se mantiene porque algunos atributos de estilo generan alturas de barras y estilos SVG desde valores ya validados; no habilita scripts en línea.

Encabezados recomendados:

```text
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-Frame-Options: DENY
```

## Datos

- Solo se procesan fuentes locales documentadas en `data-source/`.
- Se muestran estadísticas agregadas; no cargar ni publicar datos personales.
- La importación valida rangos, tipos de elección, años, entidades y registros mediante Zod.
- Los porcentajes oficiales se preservan; las diferencias de fórmula se informan.
- Los JSON de `public/data/` son salidas derivadas, no fuentes de verdad.

## Validación de cambios

Antes de publicar, ejecutar `npm run build:data`, `npm run validate:data`, `npm run check`, `npm run build`, `npm run test:e2e` y `npm run audit`. Revisar además que todas las peticiones del sitio sean locales y que los archivos generados no contengan información personal.
