import { type Abi, parseAbi } from 'viem'

/** Parses ABI input as JSON when it looks like JSON, otherwise as human-readable signatures. */
export function parseAbiInput(input: string): Abi {
  const trimmed = input.trim()
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const json = JSON.parse(trimmed)
    return (Array.isArray(json) ? json : [json]) as Abi
  }
  const lines = trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  return parseAbi(lines)
}

/** JSON.stringify replacer that renders bigints as decimal strings. */
export function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value
}
