import { SecureStorage } from '@nativescript/secure-storage'

const storage = new SecureStorage()

export const useStorage = {
  get(key: string): string | null {
    try {
      return storage.getSync({ key }) ?? null
    } catch {
      return null
    }
  },
  set(key: string, value: string): void {
    try {
      storage.setSync({ key, value })
    } catch {
      // secure-storage unavailable — fail silently
    }
  },
  remove(key: string): void {
    try {
      storage.removeSync({ key })
    } catch {
      // ignore
    }
  },
}
