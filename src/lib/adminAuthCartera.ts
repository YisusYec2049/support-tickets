const KEY = 'admin_auth_cartera'

export function isAdminCarteraAuthenticated(): boolean {
  return sessionStorage.getItem(KEY) === 'true'
}

export function setAdminCarteraAuthenticated() {
  sessionStorage.setItem(KEY, 'true')
}

export function clearAdminCarteraAuth() {
  sessionStorage.removeItem(KEY)
}
