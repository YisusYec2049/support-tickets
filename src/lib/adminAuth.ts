const KEY = 'admin_auth'

export function isAdminAuthenticated(): boolean {
  return sessionStorage.getItem(KEY) === 'true'
}

export function setAdminAuthenticated() {
  sessionStorage.setItem(KEY, 'true')
}

export function clearAdminAuth() {
  sessionStorage.removeItem(KEY)
}
