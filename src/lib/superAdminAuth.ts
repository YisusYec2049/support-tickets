const KEY = 'admin_auth_super'

export function isSuperAdminAuthenticated(): boolean {
  return sessionStorage.getItem(KEY) === 'true'
}

export function setSuperAdminAuthenticated() {
  sessionStorage.setItem(KEY, 'true')
}

export function clearSuperAdminAuth() {
  sessionStorage.removeItem(KEY)
}
