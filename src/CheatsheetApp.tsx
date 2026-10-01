import { useState } from 'react'
import { CHEATSHEET, type Command } from './cheatsheet'
import NavBar from './components/NavBar'
import Section from './components/Section'

/** Foundry / anvil command cheatsheet page with a text filter. */
export default function CheatsheetApp() {
  const [filter, setFilter] = useState('')
  const query = filter.trim().toLowerCase()
  const matches = (c: Command) =>
    !query || [c.title, c.cmd, c.note ?? ''].some((s) => s.toLowerCase().includes(query))
  const groups = CHEATSHEET.map((g) => ({ ...g, commands: g.commands.filter(matches) })).filter(
    (g) => g.commands.length,
  )

  return (
    <>
      <NavBar current="cheatsheet" />
      <main className="app">
        <h1>Foundry Cheatsheet</h1>
        <p>
          cast, anvil and forge commands for probing nodes, simulating transactions and running
          local forks. <code>$VARS</code> are placeholders to export or substitute.
        </p>
        <input
          className="cheatsheet-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter, e.g. impersonate, fork, decode"
          spellCheck={false}
        />
        {!groups.length && <p className="error">No commands match.</p>}
        <div className="masonry">
          {groups.map((g) => (
            <Section key={g.title} title={g.title} description={g.description}>
              {g.commands.map((c) => (
                <CommandBlock key={c.title} command={c} />
              ))}
            </Section>
          ))}
        </div>
      </main>
    </>
  )
}

/** Props for {@link CommandBlock}. */
type CommandBlockProps = {
  command: Command
}

/** One command with its title, copy button and optional note. */
function CommandBlock({ command }: CommandBlockProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(command.cmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="cmd">
      <label>{command.title}</label>
      <div className="copy-row">
        <pre>{command.cmd}</pre>
        <button type="button" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {command.note && <p className="cmd-note">{command.note}</p>}
    </div>
  )
}
