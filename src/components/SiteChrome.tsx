import { useEffect, useState } from "react"

type Theme = "light" | "dark"
type TextSize = "normal" | "large" | "largest"

const themeStorageKey = "ine-voto-theme"
const textSizeStorageKey = "ine-voto-text-size"
const textSizes = ["normal", "large", "largest"] as const

function readPreference<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  try {
    const stored = localStorage.getItem(key)
    return allowed.find((value) => value === stored) ?? fallback
  } catch (error) {
    console.error(`No se pudo leer la preferencia local "${key}".`, error)
    return fallback
  }
}

export function Header({ activeSection }: { activeSection: string }) {
  const [theme, setTheme] = useState<Theme>(() =>
    readPreference(themeStorageKey, ["light", "dark"], "light"),
  )
  const [textSize, setTextSize] = useState<TextSize>(() =>
    readPreference(textSizeStorageKey, ["normal", "large", "largest"], "normal"),
  )
  const [preferenceError, setPreferenceError] = useState<string | null>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.textSize = textSize
  }, [theme, textSize])

  useEffect(() => {
    const updateVisibility = () => setShowBackToTop(window.scrollY > 500)
    updateVisibility()
    window.addEventListener("scroll", updateVisibility, { passive: true })
    return () => window.removeEventListener("scroll", updateVisibility)
  }, [])

  const savePreference = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value)
      setPreferenceError(null)
    } catch (error) {
      setPreferenceError("No se pudo guardar la preferencia en este dispositivo.")
      console.error(`No se pudo guardar la preferencia local "${key}".`, error)
    }
  }

  const links = [
    ["historia", "Historia"],
    ["estados", "Explora tu estado"],
    ["perfiles", "¿Quiénes votan?"],
    ["fuentes", "Fuentes"],
  ]
  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="navbar">
        <div className="nav-inner">
          <a className="brand" href="#inicio" aria-label="15 años de tu voto, inicio">
            <span className="brand-mark" aria-hidden="true">15</span>
            <span>15 años<br />de tu voto</span>
          </a>
          <nav aria-label="Navegación principal" className="nav-links">
            {links.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className={activeSection === id ? "active" : ""}
                aria-current={activeSection === id ? "location" : undefined}
              >
                {label}
              </a>
            ))}
          </nav>
          <details className="site-preferences">
            <summary aria-label="Abrir ajustes de apariencia">Ajustes</summary>
            <div className="preferences-panel">
              <button
                type="button"
                aria-pressed={theme === "dark"}
                onClick={() => {
                  const nextTheme = theme === "dark" ? "light" : "dark"
                  setTheme(nextTheme)
                  savePreference(themeStorageKey, nextTheme)
                }}
              >
                {theme === "dark" ? "Usar modo claro" : "Usar modo oscuro"}
              </button>
              <label htmlFor="text-size">Tamaño de letra</label>
              <select
                id="text-size"
                value={textSize}
                onChange={(event) => {
                  const nextSize = textSizes.find((size) => size === event.target.value)
                  if (nextSize) {
                    setTextSize(nextSize)
                    savePreference(textSizeStorageKey, nextSize)
                  }
                }}
              >
                <option value="normal">Normal</option>
                <option value="large">Grande</option>
                <option value="largest">Más grande</option>
              </select>
              {preferenceError && <p role="alert">{preferenceError}</p>}
            </div>
          </details>
          <a className="button nav-action" href="#estados">Explora los datos</a>
        </div>
      </header>
      {showBackToTop && (
        <button
          className="back-to-top"
          type="button"
          onClick={() => window.scrollTo({
            top: 0,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "auto"
              : "smooth",
          })}
        >
          Volver arriba
        </button>
      )}
    </>
  )
}

export function Footer() {
  return (
    <footer className="footer" id="fuentes">
      <div className="container footer-grid">
        <div>
          <a className="brand footer-brand" href="#inicio"><span className="brand-mark">15</span><span>15 años<br />de tu voto</span></a>
          <p>Datos que construyen democracia.</p>
        </div>
        <div>
          <h2>Fuentes y metodología</h2>
          <p>Fuentes: Plataforma CCPC 2009–2024 e Instituto Nacional Electoral (INE). Datos de esta versión: nacional, estados 2024, composición de votantes, edad promedio y cuartiles estatales.</p>
          <p>Participación = votos emitidos / (votos emitidos + no votaron) × 100. La lista nominal no se usa como denominador.</p>
          <p>Presidenciales e intermedias se presentan por separado. Los porcentajes oficiales se conservan; la fórmula solo se usa como verificación.</p>
          <p>Participación por estado solo disponible para 2024 en esta versión.</p>
          <h3>Cómo leer los datos</h3>
          <p><strong>Dato pendiente:</strong> la fuente no entrega ese desglose; no se estima ni se interpola.</p>
          <p><strong>Aproximado:</strong> valor marcado como aproximado en la fuente.</p>
        </div>
        <p className="copyright">© 2026 · 15 años de tu voto</p>
      </div>
    </footer>
  )
}
