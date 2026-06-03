import { CHAINS } from '../chains'
import { useSettings } from '../settings'
import Section from './Section'

/** Global settings card; values persist to localStorage. */
export default function SettingsSection() {
  const { settings, chain, rpcUrl, update, setRpcUrl } = useSettings()

  return (
    <Section
      title="Settings"
      description="Global settings, saved to your browser's local storage. The RPC URL is remembered per chain."
    >
      <label>Chain</label>
      <select
        value={settings.chainId}
        onChange={(e) => update({ chainId: Number(e.target.value) })}
      >
        {CHAINS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.id})
          </option>
        ))}
      </select>
      <label>RPC URL — {chain.name}</label>
      <input
        value={rpcUrl}
        onChange={(e) => setRpcUrl(settings.chainId, e.target.value)}
        placeholder={chain.rpcUrl}
        spellCheck={false}
      />
    </Section>
  )
}
