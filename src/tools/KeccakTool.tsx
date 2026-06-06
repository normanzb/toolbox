import { useMemo } from 'react'
import { keccak256, stringToBytes } from 'viem'
import CopyField from '../components/CopyField'
import Section from '../components/Section'
import { useUrlParam } from '../urlState'

/** Keccak-256 hasher with 4-byte selector output, e.g. keccak256("MintPaused()")[0:4]. */
export default function KeccakTool() {
  const [input, setInput] = useUrlParam('keccak', 'MintPaused()')

  const result = useMemo(() => {
    if (!input) return null
    try {
      const trimmed = input.trim()
      const hash =
        /^0x([0-9a-fA-F]{2})*$/.test(trimmed) && trimmed.length > 2
          ? keccak256(trimmed as `0x${string}`)
          : keccak256(stringToBytes(input))
      return { hash, selector: hash.slice(0, 10) }
    } catch {
      return null
    }
  }, [input])

  return (
    <Section
      title="Keccak-256"
      description="Hashes UTF-8 text; input starting with 0x is hashed as raw bytes. First 4 bytes give the function selector / event topic prefix."
    >
      <label>Input</label>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="MintPaused()"
        spellCheck={false}
      />
      <CopyField label="keccak256" value={result?.hash ?? ''} />
      <CopyField label="First 4 bytes (selector)" value={result?.selector ?? ''} />
    </Section>
  )
}
