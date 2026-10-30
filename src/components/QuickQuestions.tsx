export function QuickQuestions() {
  return (
    <nav className="quick-questions container" aria-label="Preguntas rápidas">
      <p>¿Qué quieres consultar?</p>
      <a className="button button-secondary" href="#historia">
        ¿Cómo cambió la participación nacional?
      </a>
      <a className="button button-secondary" href="#cuartiles">
        ¿Qué tan distintas son las entidades?
      </a>
      <a className="button button-secondary" href="#estados">
        ¿Cómo participó mi estado?
      </a>
      <a className="button button-secondary" href="#perfiles">
        ¿Qué muestran los datos por perfil?
      </a>
    </nav>
  )
}
