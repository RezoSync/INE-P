export function Header({ activeSection }: { activeSection: string }) {
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
          <a className="button nav-action" href="#estados">Explora los datos</a>
        </div>
      </header>
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
