import { useSettings } from '../settings'
import Section from './Section'

/** Global settings card; values persist to localStorage. */
export default function SettingsSection() {
  const { settings, update } = useSettings()

  return (
    <Section
      title="Settings"
      description="Global settings, saved to your browser's local storage."
    >
      <label>RPC URL</label>
      <input
        value={settings.rpcUrl}
        onChange={(e) => update({ rpcUrl: e.target.value })}
        placeholder="https://ethereum-rpc.publicnode.com"
        spellCheck={false}
      />
    </Section>
  )
}
