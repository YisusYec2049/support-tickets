import { supabase } from '../lib/supabase'

/**
 * Esquema de Realtime. Los datos viven en `tickets` desde la migración del 23/7/2026;
 * las suscripciones viejas seguían escuchando `public` y nunca recibían eventos.
 */
export const RT_SCHEMA = 'tickets'

/** Sube un archivo al bucket público `attachments` y devuelve su URL pública. */
export async function subirAdjunto(file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const fileName = `${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('attachments').upload(fileName, file)
  if (error) throw new Error(`Error al subir el adjunto: ${error.message}`)
  return supabase.storage.from('attachments').getPublicUrl(fileName).data.publicUrl
}

/* ── "visto" por caso, en este navegador (misma llave que usaba MisCasos) ── */
export const getLastSeen = (casoId: string) => localStorage.getItem(`seen_${casoId}`)
export const markAsSeen = (casoId: string) => localStorage.setItem(`seen_${casoId}`, new Date().toISOString())

/* ── último correo con el que se entró en este navegador (para "Continuar como") ── */
const LAST_EMAIL = 'mda_last_email'
export function getLastEmail(): string | null {
  try { return localStorage.getItem(LAST_EMAIL) } catch { return null }
}
export function setLastEmail(email: string) {
  try { localStorage.setItem(LAST_EMAIL, email.toLowerCase().trim()) } catch { /* sin almacenamiento */ }
}
