import SettingsSection from './components/SettingsSection'
import ShareButton from './components/ShareButton'
import { SettingsProvider } from './settings'
import BlockProbeTool from './tools/BlockProbeTool'
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
          keys that hold real funds. Tool inputs are reflected in the URL (RPC URLs are not), so
          you can share your setup as a link.
        </p>
        <ShareButton />
        <SettingsSection />
        <KeyTool />
        <SignTool />
        <KeccakTool />
        <Eip1967Tool />
        <BlockProbeTool />
      </main>
    </SettingsProvider>
  )
}
