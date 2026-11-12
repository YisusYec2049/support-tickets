// Catálogos de la Mesa de Ayuda · Dirección Financiera.
// Deben coincidir con los CHECK constraints de `tickets.casos_soporte` (ver Database.md).

export const TIPOS_SOPORTE = [
  'Inscripciones',
  'Comprobantes de Ingreso',
  'Acuerdo de pago',
  'Ordenes de Trabajo',
  'Comprobante de Egreso',
  'Conciliaciones Bancarias',
  'Reportes',
  'Link de Pago',
  'Otros',
]

/** Trámites internos sin inscripción detrás: el bloque de inscripción no se pide y se guarda vacío. */
export const SIN_INSCRIPCION = [
  'Ordenes de Trabajo',
  'Comprobante de Egreso',
  'Conciliaciones Bancarias',
  'Reportes',
]

/** Tipos cuyo ID no se muestra en el detalle. */
export const SIN_ID = ['Conciliaciones Bancarias', 'Reportes', 'Link de Pago']

export const ID_LABEL: Record<string, string> = {
  'Inscripciones': 'N° Inscripción',
  'Comprobantes de Ingreso': 'ID del Comprobante de Ingreso',
  'Acuerdo de pago': 'ID del Acuerdo de pago',
  'Ordenes de Trabajo': 'ID de la Orden de Trabajo',
  'Comprobante de Egreso': 'ID del Comprobante de Egreso',
  'Otros': 'ID',
}

export const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  proceso: 'En proceso',
  resuelto: 'Resuelto',
}
