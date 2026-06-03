import SettingsSection from './components/SettingsSection'
import { SettingsProvider } from './settings'
import Eip1967Tool from './tools/Eip1967Tool'
import KeccakTool from './tools/KeccakTool'
import KeyTool from './tools/KeyTool'
import SignTool from './tools/SignTool'

/** Ethereum developer toolbox — all tools run client-side. */
export default function App() {
  return (
    <SettingsProvider>
      <main className="app">
        <h1>Ethereum Toolbox</h1>
        <p>
          Common Ethereum dev utilities. Keys never leave your browser — but don't paste private
          keys that hold real funds.
        </p>
        <SettingsSection />
        <KeyTool />
        <SignTool />
        <KeccakTool />
        <Eip1967Tool />
      </main>
    </SettingsProvider>
  )
}
