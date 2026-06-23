const KEY = 'user_email'

export function getUserEmail(): string | null {
  return sessionStorage.getItem(KEY)
}

export function setUserEmail(email: string) {
  sessionStorage.setItem(KEY, email.toLowerCase().trim())
}

export function clearUserEmail() {
  sessionStorage.removeItem(KEY)
}
