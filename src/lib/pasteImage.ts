import { useEffect, useRef } from 'react'

const EXT_POR_TIPO: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
}

function extensionDe(tipo: string): string {
  if (EXT_POR_TIPO[tipo]) return EXT_POR_TIPO[tipo]
  const sub = tipo.split('/')[1]?.split('+')[0]?.replace(/[^a-z0-9]/gi, '')
  return sub || 'png'
}

/**
 * Saca la primera imagen del portapapeles y la devuelve con un nombre propio.
 * El File que entrega el navegador al pegar suele llamarse 'image.png' o venir
 * sin nombre, y la subida a Storage arma el nombre del objeto con
 * `file.name.split('.').pop()` — sin extensión real ese nombre queda roto.
 */
export function imagenDelPortapapeles(items: DataTransferItemList | null | undefined): File | null {
  if (!items) return null
  for (const item of Array.from(items)) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (!file) continue
    return new File([file], `captura-${Date.now()}.${extensionDe(file.type)}`, { type: file.type })
  }
  return null
}

/**
 * Mientras `activo` sea true, escucha Ctrl+V en toda la página y entrega la
 * imagen pegada. Va en `document` y no en el form a propósito: si el foco no
 * está en un campo de texto, el evento de pegado nace en el `body` y nunca
 * llegaría a un handler puesto sobre el formulario.
 */
export function usePasteImage(activo: boolean, onImagen: (file: File) => void) {
  const onImagenRef = useRef(onImagen)

  useEffect(() => {
    onImagenRef.current = onImagen
  })

  useEffect(() => {
    if (!activo) return
    function handler(e: ClipboardEvent) {
      const file = imagenDelPortapapeles(e.clipboardData?.items)
      if (!file) return
      e.preventDefault()
      onImagenRef.current(file)
    }
    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [activo])
}
