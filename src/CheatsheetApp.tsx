import { useState } from 'react'
import { CHEATSHEETS } from './cheatsheets'
import type { Command, CommandGroup, Table } from './cheatsheets/types'
import NavBar from './components/NavBar'
import Section from './components/Section'
import { useUrlParam } from './urlState'

/** Cheatsheet page: one tab per sheet, with a text filter. */
export default function CheatsheetApp() {
  const [sheetId, setSheetId] = useUrlParam('sheet', CHEATSHEETS[0].id)
  const [filter, setFilter] = useState('')
  const sheet = CHEATSHEETS.find((s) => s.id === sheetId) ?? CHEATSHEETS[0]
  const query = filter.trim().toLowerCase()
  const has = (s: string) => s.toLowerCase().includes(query)
  const matches = (c: Command) => !query || [c.title, c.cmd, c.note ?? ''].some(has)
  const tableMatches = (g: CommandGroup) =>
    !!g.table &&
    (!query || has(g.title) || has(g.description ?? '') || g.table.rows.flat().some(has))
  const groups = sheet.groups
    .map((g) => ({ ...g, commands: g.commands.filter(matches), table: tableMatches(g) ? g.table : undefined }))
    .filter((g) => g.commands.length || g.table)

  const renderGroup = (g: CommandGroup) => (
    <Section key={g.title} title={g.title} description={g.description}>
      {g.table && <TableBlock table={g.table} />}
      {g.commands.map((c) => (
        <CommandBlock key={c.title} command={c} />
      ))}
    </Section>
  )

  return (
    <>
      <NavBar current="cheatsheet" />
      <main className="app">
        <h1>Cheatsheets</h1>
        <div className="tabs" role="tablist">
          {CHEATSHEETS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === sheet.id}
              className={s.id === sheet.id ? 'active' : undefined}
              onClick={() => setSheetId(s.id)}
            >
              {s.title}
            </button>
          ))}
        </div>
        <p>{sheet.description}</p>
        <input
          className="cheatsheet-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={`Filter ${sheet.title}`}
          spellCheck={false}
        />
        {!groups.length && <p className="error">Nothing matches.</p>}
        {groups.filter((g) => g.wide).map(renderGroup)}
        <div className="masonry">{groups.filter((g) => !g.wide).map(renderGroup)}</div>
      </main>
    </>
  )
}

/** Props for {@link TableBlock}. */
type TableBlockProps = {
  table: Table
}

/** A compact reference table; first column is the row header. */
function TableBlock({ table }: TableBlockProps) {
  return (
    <div className="cheatsheet-table">
      <table>
        <thead>
          <tr>
            {table.columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map(([head, ...cells]) => (
            <tr key={head}>
              <th>{head}</th>
              {cells.map((c, i) => (
                <td key={table.columns[i + 1]}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
