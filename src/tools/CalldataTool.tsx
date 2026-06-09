import { useMemo } from 'react'
import { type Abi, decodeFunctionData, parseAbi } from 'viem'
import CopyField from '../components/CopyField'
import Section from '../components/Section'
import { useUrlParam } from '../urlState'

type Decoded = {
  /** Resolved function name. */
  functionName: string
  /** Decoded arguments, pretty-printed (bigints as decimal strings). */
  args: string
}

/** Decodes transaction calldata against a function ABI using viem. */
export default function CalldataTool() {
  const [abi, setAbi] = useUrlParam('abi')
  const [data, setData] = useUrlParam('calldata')

  const result = useMemo<{ decoded?: Decoded; error?: string }>(() => {
    const abiInput = abi.trim()
    const dataInput = data.trim()
    if (!abiInput || !dataInput) return {}
    if (!/^0x[0-9a-fA-F]*$/.test(dataInput)) {
      return { error: 'Calldata must be a 0x-prefixed hex string.' }
    }
    let parsed: Abi
    try {
      parsed = parseAbiInput(abiInput)
    } catch (e) {
      return { error: `Invalid ABI: ${e instanceof Error ? e.message : String(e)}` }
    }
    try {
      const { functionName, args } = decodeFunctionData({
        abi: parsed,
        data: dataInput as `0x${string}`,
      })
      return {
        decoded: {
          functionName,
          args: JSON.stringify(args ?? [], bigintReplacer, 2),
        },
      }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }, [abi, data])

  return (
    <Section
      title="Calldata decoder"
      description="Decodes transaction calldata against a function ABI. The ABI accepts human-readable signatures (one per line) or a JSON ABI array; the 4-byte selector is matched automatically."
    >
      <label>Function ABI</label>
      <textarea
        value={abi}
        onChange={(e) => setAbi(e.target.value)}
        rows={3}
        placeholder={'function transfer(address to, uint256 amount)'}
        spellCheck={false}
      />
      <label>Calldata</label>
      <textarea
        value={data}
        onChange={(e) => setData(e.target.value)}
        rows={3}
        placeholder="0xa9059cbb…"
        spellCheck={false}
      />
      {result.error && <p className="error">{result.error}</p>}
      {result.decoded && (
        <>
          <CopyField label="Function" value={result.decoded.functionName} />
          <CopyField label="Arguments" value={result.decoded.args} />
        </>
      )}
    </Section>
  )
}

/** Parses ABI input as JSON when it looks like JSON, otherwise as human-readable signatures. */
function parseAbiInput(input: string): Abi {
  if (input.startsWith('[') || input.startsWith('{')) {
    const json = JSON.parse(input)
    return (Array.isArray(json) ? json : [json]) as Abi
  }
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  return parseAbi(lines)
}

/** JSON.stringify replacer that renders bigints as decimal strings. */
function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value
}
