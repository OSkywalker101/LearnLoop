import type { AIProviderConfig } from '../types'

const OBFUSCATED_KEY = 'PSg3AgoMOmMOLSkODjUoKw1kGS4CETwWChk7GThoGgRnLyVjOQ82bjJRFhAtMzEWUygjPW8SCCE='
const XOR_SEED = 0x5a

function decode(encoded: string): string {
  try {
    const raw = atob(encoded)
    let out = ''
    for (let i = 0; i < raw.length; i++) {
      out += String.fromCharCode(raw.charCodeAt(i) ^ (XOR_SEED + (i % 7)))
    }
    return out
  } catch {
    return ''
  }
}

const USER_KEY_STORAGE = 'learnloop_user_api_key'

export function getUserApiKey(): string | null {
  try {
    return localStorage.getItem(USER_KEY_STORAGE)
  } catch {
    return null
  }
}

export function setUserApiKey(key: string | null): void {
  try {
    if (key && key.trim()) localStorage.setItem(USER_KEY_STORAGE, key.trim())
    else localStorage.removeItem(USER_KEY_STORAGE)
  } catch {
    /* storage unavailable */
  }
}

export function getGroqApiKey(): string | undefined {
  return getUserApiKey() || decode(OBFUSCATED_KEY) || undefined
}

export function getAIConfig(): AIProviderConfig {
  const provider = (import.meta.env.VITE_AI_PROVIDER as 'groq' | 'demo') || 'groq'
  const apiKey = getGroqApiKey()
  return {
    provider: apiKey ? provider : 'demo',
    apiKey,
    model: (import.meta.env.VITE_GROQ_MODEL as string) || undefined,
    maxRetries: 2,
    timeoutMs: 30000,
  }
}
