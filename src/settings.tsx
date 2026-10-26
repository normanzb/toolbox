import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react'
import { CHAINS, type Chain } from './chains'
import { readUrlParam, useUrlParam, writeUrlParam } from './urlState'

const STORAGE_KEY = 'toolbox.settings'

/** Global app settings. */
export type Settings = {
  /** Selected preset chain id; ignored while `custom` is set. */
  chainId: number
  /** Use the manually entered chain instead of a preset. */
  custom: boolean
  /** Raw text so a half-typed id survives; parsed into `chain.id`. */
  customChainId: string
  customChainName: string
  /** JSON-RPC endpoint per chain id. */
  rpcUrls: Record<number, string>
}

type SettingsContextValue = {
  settings: Settings
  /** Active chain; a custom chain with an invalid id gets id 0. */
  chain: Chain
  /** RPC URL of the active chain. */
  rpcUrl: string
  /** Merges a partial update into settings; persists automatically. */
  update: (patch: Partial<Settings>) => void
  /** Sets the RPC URL for one chain. */
  setRpcUrl: (chainId: number, url: string) => void
  /** Shared private key used by every tool that signs; URL-synced, never persisted. */
  privateKey: string
  setPrivateKey: (privateKey: string) => void
}

const defaultSettings: Settings = {
  chainId: 1,
  custom: false,
  customChainId: '',
  customChainName: '',
  rpcUrls: Object.fromEntries(CHAINS.map((chain) => [chain.id, chain.rpcUrl])),
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

/** Provides global settings, persisted to localStorage. */
export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [privateKey, setPrivateKey] = useUrlParam('pk')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const chain = settings.custom
    ? {
        id: parseChainId(settings.customChainId) ?? 0,
        name: settings.customChainName.trim() || 'Custom chain',
        rpcUrl: '',
      }
    : (CHAINS.find((c) => c.id === settings.chainId) ?? CHAINS[0])

  // Keep the active chain in the URL so links are shareable. RPC URLs stay local.
  useEffect(() => {
    writeUrlParam('chain', chain.id ? String(chain.id) : '')
    writeUrlParam('chain-name', settings.custom ? settings.customChainName.trim() : '')
  }, [chain.id, settings.custom, settings.customChainName])

  const update = (patch: Partial<Settings>) =>
    setSettings((current) => ({ ...current, ...patch }))

  const setRpcUrl = (chainId: number, url: string) =>
    setSettings((current) => ({
      ...current,
      rpcUrls: { ...current.rpcUrls, [chainId]: url },
    }))

  return (
    <SettingsContext.Provider
      value={{
        settings,
        chain,
        rpcUrl: settings.rpcUrls[chain.id] ?? '',
        update,
        setRpcUrl,
        privateKey,
        setPrivateKey,
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
  let stored: Partial<Settings> = {}
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') ?? {}
  } catch {
    // Ignore corrupt storage.
  }
  const storedChainId = CHAINS.some((c) => c.id === stored.chainId)
    ? (stored.chainId as number)
    : defaultSettings.chainId
  const base: Settings = {
    chainId: storedChainId,
    custom: stored.custom === true,
    customChainId: typeof stored.customChainId === 'string' ? stored.customChainId : '',
    customChainName: typeof stored.customChainName === 'string' ? stored.customChainName : '',
    rpcUrls: { ...defaultSettings.rpcUrls, ...stored.rpcUrls },
  }
  // The chain in a shared URL wins over the locally stored one; an unknown id means a custom chain.
  const urlChainId = parseChainId(readUrlParam('chain') ?? '')
  if (urlChainId === null) return base
  if (CHAINS.some((c) => c.id === urlChainId)) return { ...base, chainId: urlChainId, custom: false }
  return {
    ...base,
    custom: true,
    customChainId: String(urlChainId),
    customChainName: readUrlParam('chain-name') ?? '',
  }
}

/** Parses a positive integer chain id; null when invalid. */
export function parseChainId(input: string): number | null {
  const trimmed = input.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const id = Number(trimmed)
  return id > 0 && Number.isSafeInteger(id) ? id : null
}
