import type { CasoCartera, CasoSoporte } from '../types'

/** Caso de cualquiera de los dos módulos (Cartera agrega unidad y responsable). */
export type Caso = CasoSoporte & Partial<Pick<CasoCartera, 'unidad_negocio' | 'atendido_por'>>

export interface Modulo {
  key: 'fin' | 'car'
  /** Tablas en el esquema `tickets`. */
  casos: 'casos_soporte' | 'casos_cartera'
  mensajes: 'mensajes_casos' | 'mensajes_cartera'
  prefijo: 'CASO-' | 'CAR-'
  /** Rutas del lado del usuario. */
  base: string
  nuevo: string
  marca: string
  /** Quién responde, en la conversación y en la ficha ("Soporte: …"). */
  equipo: string
  corto: string
  banda: string
  sigue: [string, string, string]
}

export const FIN: Modulo = {
  key: 'fin',
  casos: 'casos_soporte',
  mensajes: 'mensajes_casos',
  prefijo: 'CASO-',
  base: '/mis-casos',
  nuevo: '/nuevo-caso',
  marca: 'Mesa de Ayuda · Dirección Financiera',
  equipo: 'Soporte Financiero',
  corto: 'Soporte',
  banda: 'Reportar un problema o pedir un trámite. Te respondemos por esta misma mesa.',
  sigue: ['Soporte ya lo tiene en su lista.', 'Soporte lo revisa', 'Pasa a “En proceso” cuando lo abren.'],
}

export const CAR: Modulo = {
  key: 'car',
  casos: 'casos_cartera',
  mensajes: 'mensajes_cartera',
  prefijo: 'CAR-',
  base: '/cartera/mis-casos',
  nuevo: '/cartera/nuevo-caso',
  marca: 'Mesa de Ayuda · Cartera',
  equipo: 'Equipo de Cartera',
  corto: 'Cartera',
  banda: 'Cuotas, pagos mal aplicados o cruzados. Te responde el equipo de Cartera por esta misma mesa.',
  sigue: ['El equipo de Cartera ya lo tiene en su lista.', 'Cartera lo revisa', 'Pasa a “En proceso” cuando alguien del equipo lo toma.'],
}

export const TIPOS_CARTERA = ['Fechas Cuotas', 'Valores Cuotas', 'Pago mal aplicado', 'Pago cruzado con otro cliente', 'Otro']
export const UNIDADES = ['Diplomados', 'Especializaciones']
export const ADMINS_CARTERA = ['Magda Sichaca', 'Ricardo Zea', 'Yeimy Rocio Alba', 'Yeimy Prada']

export const iniciales = (n: string) => n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

/** Genera el siguiente número del módulo (máximo actual + 1). */
export async function siguienteNumero(sb: typeof import('../lib/supabase').supabase, mod: Modulo): Promise<string> {
  const { data, error } = await sb.from(mod.casos).select('caso_numero').order('caso_numero', { ascending: false }).limit(1)
  if (error) throw error
  if (!data || data.length === 0) return `${mod.prefijo}00001`
  const num = parseInt(String(data[0].caso_numero).replace(mod.prefijo, ''), 10)
  return `${mod.prefijo}${String(num + 1).padStart(5, '0')}`
}
