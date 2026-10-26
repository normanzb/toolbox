import { CHAINS } from '../chains'
import { parseChainId, useSettings } from '../settings'
import Section from './Section'

const CUSTOM = 'custom'

/** Global settings card; values persist to localStorage. */
export default function SettingsSection() {
  const { settings, chain, rpcUrl, update, setRpcUrl } = useSettings()
  const invalidCustomId = settings.custom && parseChainId(settings.customChainId) === null

  return (
    <Section
      title="Settings"
      description="Global settings, saved to your browser's local storage. The RPC URL is remembered per chain."
    >
      <label>Chain</label>
      <select
        value={settings.custom ? CUSTOM : settings.chainId}
        onChange={(e) =>
          e.target.value === CUSTOM
            ? update({ custom: true })
            : update({ custom: false, chainId: Number(e.target.value) })
        }
      >
        {CHAINS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.id})
          </option>
        ))}
        <option value={CUSTOM}>Custom chain…</option>
      </select>
      {settings.custom && (
        <>
          <label>Chain ID</label>
          <input
            value={settings.customChainId}
            onChange={(e) => update({ customChainId: e.target.value })}
            placeholder="e.g. 31337"
            inputMode="numeric"
            spellCheck={false}
          />
          {settings.customChainId && invalidCustomId && (
            <p className="error">Chain ID must be a positive integer.</p>
          )}
          <label>Chain name</label>
          <input
            value={settings.customChainName}
            onChange={(e) => update({ customChainName: e.target.value })}
            placeholder="e.g. Local anvil"
            spellCheck={false}
          />
        </>
      )}
      <label>RPC URL — {chain.name}</label>
      <input
        value={rpcUrl}
        onChange={(e) => setRpcUrl(chain.id, e.target.value)}
        placeholder={invalidCustomId ? 'Enter a chain ID first' : chain.rpcUrl || 'https://…'}
        disabled={invalidCustomId}
        spellCheck={false}
      />
    </Section>
  )
}
