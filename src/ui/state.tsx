import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { byId } from '../calculators/catalog'
import type { CalculationResult } from '../calculators/core'

type HistoryEntry = { key: string; calculator: string; output: CalculationResult; time: number }
type Theme = 'light' | 'dark'
type Workspace = {
  favorites: string[]
  recents: string[]
  history: HistoryEntry[]
  theme: Theme
  toggleFavorite(id: string): void
  visit(id: string): void
  record(id: string, output: CalculationResult): void
  clearHistory(): void
  toggleTheme(): void
}
const Context = createContext<Workspace | null>(null)

function read<T>(key: string, fallback: T): T {
  try {
    const value = JSON.parse(localStorage.getItem(`calcspace:${key}`) ?? 'null')
    return Array.isArray(value) ? value as T : fallback
  } catch { return fallback }
}
function write(key: string, value: string) {
  try { localStorage.setItem(`calcspace:${key}`, value) } catch { /* Preferences still work for the current session. */ }
}
function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => read(key, initial))
  useEffect(() => write(key, JSON.stringify(value)), [key,value])
  return [value, setValue] as const
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useStored<string[]>('favorites', [])
  const [recents, setRecents] = useStored<string[]>('recents', [])
  const [history, setHistory] = useStored<HistoryEntry[]>('history', [])
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#151522' : '#f7f8fc')
  }, [theme])
  return <Context.Provider value={{
    favorites: favorites.filter(id => byId.has(id)), recents: recents.filter(id => byId.has(id)),
    history: history.filter(item => item && byId.has(item.calculator) && Array.isArray(item.output)),
    theme,
    toggleFavorite: id => setFavorites(previous => previous.includes(id) ? previous.filter(item => item !== id) : [id, ...previous]),
    visit: id => setRecents(previous => previous[0] === id ? previous : [id,...previous.filter(item => item !== id)].slice(0,12)),
    record: (calculator, output) => {
      const time = Date.now()
      const key = globalThis.crypto?.randomUUID?.() ?? `${time}-${Math.random()}`
      setHistory(previous => [{ key, calculator, output, time }, ...previous].slice(0,40))
    },
    clearHistory: () => { setHistory([]); setRecents([]) },
    toggleTheme: () => {
      const next = theme === 'dark' ? 'light' : 'dark'
      setTheme(next)
      write('theme', next)
    },
  }}>{children}</Context.Provider>
}

export function useWorkspace() { return useContext(Context)! }

export async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch { /* Try the selection-based fallback. */ }
  }
  const previous = document.activeElement
  const input = document.createElement('textarea')
  input.value = value
  input.style.cssText = 'position:fixed;opacity:0;top:0;pointer-events:none'
  document.body.append(input)
  try {
    input.select()
    if (!document.execCommand('copy')) throw new Error('Clipboard unavailable')
  } finally {
    input.remove()
    if (previous instanceof HTMLElement) previous.focus()
  }
}
