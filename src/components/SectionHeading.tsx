import type { ReactNode } from "react"

export function SectionHeading({
  number,
  eyebrow,
  title,
  description,
}: {
  number: string
  eyebrow: string
  title: ReactNode
  description: string
}) {
  return (
    <div className="section-heading">
      <div>
        <p className="section-number">{number} / PLATAFORMA CCPC</p>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <p className="section-description">{description}</p>
    </div>
  )
}
