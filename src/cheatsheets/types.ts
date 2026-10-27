/** One copyable snippet with a short explanation. */
export type Command = {
  title: string
  cmd: string
  note?: string
}

/** A small reference table, e.g. a conflict matrix. */
export type Table = {
  columns: string[]
  rows: string[][]
}

/** A titled group of related snippets, optionally with a table. */
export type CommandGroup = {
  title: string
  description?: string
  commands: Command[]
  table?: Table
  /** Spans the full page width instead of one masonry column; for wide tables. */
  wide?: boolean
}

/** One cheatsheet tab. */
export type Cheatsheet = {
  /** Stable id used in the URL. */
  id: string
  title: string
  description: string
  groups: CommandGroup[]
}
