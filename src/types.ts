export interface CasoSoporte {
  id: string
  caso_numero: string
  nombre: string
  tipo_usuario: string
  numero_id: string
  correo: string
  descripcion: string
  estado: 'pendiente' | 'proceso' | 'resuelto'
  created_at: string
  updated_at: string
}

export interface MensajeCaso {
  id: string
  caso_id: string
  autor: 'usuario' | 'admin'
  mensaje: string
  created_at: string
}
