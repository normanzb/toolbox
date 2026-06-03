import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react'
import { CHAINS, type Chain } from './chains'

const STORAGE_KEY = 'toolbox.settings'

/** Global app settings. */
export type Settings = {
  /** Active chain id. */
  chainId: number
  /** JSON-RPC endpoint per chain id. */
  rpcUrls: Record<number, string>
}

type SettingsContextValue = {
  settings: Settings
  /** Active chain. */
  chain: Chain
  /** RPC URL of the active chain. */
  rpcUrl: string
  /** Merges a partial update into settings; persists automatically. */
  update: (patch: Partial<Settings>) => void
  /** Sets the RPC URL for one chain. */
  setRpcUrl: (chainId: number, url: string) => void
}

const defaultSettings: Settings = {
  chainId: 1,
  rpcUrls: Object.fromEntries(CHAINS.map((chain) => [chain.id, chain.rpcUrl])),
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

  const setRpcUrl = (chainId: number, url: string) =>
    setSettings((current) => ({
      ...current,
      rpcUrls: { ...current.rpcUrls, [chainId]: url },
    }))

  const chain = CHAINS.find((c) => c.id === settings.chainId) ?? CHAINS[0]

  return (
    <SettingsContext.Provider
      value={{
        settings,
        chain,
        rpcUrl: settings.rpcUrls[settings.chainId] ?? '',
        update,
        setRpcUrl,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

/** Returns global settings and updaters. Must be used under {@link SettingsProvider}. */
export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used within SettingsProvider')
  return context
}

function loadSettings(): Settings {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return {
      chainId: CHAINS.some((c) => c.id === stored.chainId)
        ? stored.chainId
        : defaultSettings.chainId,
      rpcUrls: { ...defaultSettings.rpcUrls, ...stored.rpcUrls },
    }
  } catch {
    return defaultSettings
  }
}
