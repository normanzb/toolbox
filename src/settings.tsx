import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react'

const STORAGE_KEY = 'toolbox.settings'

/** Global app settings. */
export type Settings = {
  /** JSON-RPC endpoint used by tools that read chain state. */
  rpcUrl: string
}

type SettingsContextValue = {
  settings: Settings
  /** Merges a partial update into settings; persists automatically. */
  update: (patch: Partial<Settings>) => void
}

const defaultSettings: Settings = {
  rpcUrl: 'https://ethereum-rpc.publicnode.com',
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

/** Provides global settings, persisted to localStorage. */
export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const update = (patch: Partial<Settings>) =>
    setSettings((current) => ({ ...current, ...patch }))

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      {children}
    </SettingsContext.Provider>
  )
}

/** Returns global settings and an updater. Must be used under {@link SettingsProvider}. */
export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used within SettingsProvider')
  return context
}

function loadSettings(): Settings {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  } catch {
    return defaultSettings
  }
}
