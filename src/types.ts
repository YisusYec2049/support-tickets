export interface CasoSoporte {
  id: string
  caso_numero: string
  nombre: string
  tipo_usuario: string
  numero_id: string
  nombre_inscripcion: string
  correo: string
  tipo_soporte: string
  descripcion: string
  estado: 'pendiente' | 'proceso' | 'resuelto'
  created_at: string
  updated_at: string
  adjunto_url?: string | null
}

export interface MensajeCaso {
  id: string
  caso_id: string
  autor: 'usuario' | 'admin'
  mensaje: string
  created_at: string
  adjunto_url?: string | null
}

export interface CasoUnificado {
  id: string
  caso_numero: string
  nombre: string
  correo: string
  tipo_soporte: string
  tipo_usuario?: string
  numero_id?: string
  descripcion: string
  estado: 'pendiente' | 'proceso' | 'resuelto'
  created_at: string
  updated_at: string
  adjunto_url?: string | null
  modulo: 'financiera' | 'cartera'
}

export interface CasoCartera {
  id: string
  caso_numero: string
  nombre: string
  correo: string
  tipo_usuario: string
  numero_id: string
  nombre_inscripcion: string
  tipo_soporte: string
  descripcion: string
  estado: 'pendiente' | 'proceso' | 'resuelto'
  created_at: string
  updated_at: string
  adjunto_url?: string | null
}
