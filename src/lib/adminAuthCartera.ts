export function nombreToEmail(nombre: string): string {
  return (
    nombre
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '.') +
    '@cartera.com'
  )
}
