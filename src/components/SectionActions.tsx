import { useState } from "react"
import { toCsv, type DownloadRow } from "../data/csv"

export type { DownloadRow, DownloadValue } from "../data/csv"

export function SectionActions({
  sectionId,
  fileName,
  rows,
}: {
  sectionId: string
  fileName?: string
  rows?: DownloadRow[]
}) {
  const [message, setMessage] = useState("")
  const canDownload = rows !== undefined

  const download = () => {
    if (!rows?.length) {
      setMessage("No hay filas disponibles para descargar en esta sección.")
      return
    }

    try {
      const csv = `\uFEFF${toCsv(rows)}`
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${fileName ?? sectionId}.csv`
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage(`Se descargaron ${rows.length} filas en formato CSV.`)
    } catch (error) {
      setMessage("No se pudo preparar la descarga. Inténtalo de nuevo.")
      console.error(`Error al generar CSV para ${sectionId}:`, error)
    }
  }

  const share = async () => {
    try {
      const url = new URL(window.location.href)
      url.hash = sectionId
      await navigator.clipboard.writeText(url.toString())
      setMessage("Enlace de esta sección copiado.")
    } catch (error) {
      setMessage("No se pudo copiar el enlace. Puedes compartir la dirección de esta sección desde la barra del navegador.")
      console.error(`Error al copiar el enlace de ${sectionId}:`, error)
    }
  }

  return (
    <div className="section-actions">
      {canDownload && (
        <button className="button button-secondary" type="button" onClick={download}>
          Descargar datos (CSV)
        </button>
      )}
      <button className="button button-secondary" type="button" onClick={() => void share()}>
        Compartir esta sección
      </button>
      {message && <p className="section-action-message" role="status">{message}</p>}
    </div>
  )
}
