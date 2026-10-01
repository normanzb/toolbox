import { useState } from 'react'
import { createPublicClient, formatGwei, hexToBigInt, http, numberToHex, type Hex } from 'viem'
import CopyField from '../components/CopyField'
import Section from '../components/Section'
import { useSettings } from '../settings'
import { useUrlParam } from '../urlState'

/** Raw `eth_getBlockByNumber` response fields we display. */
type RawBlock = {
  number: Hex
  hash: Hex | null
  parentHash: Hex
  timestamp: Hex
  miner: Hex
  gasUsed: Hex
  gasLimit: Hex
  baseFeePerGas?: Hex | null
  transactions: Hex[]
}

type ProbeResult =
  | { kind: 'null' }
  | { kind: 'block'; block: RawBlock }

/** Probes the RPC with `eth_getBlockByNumber` for a given block number and shows the raw result. */
export default function BlockProbeTool() {
  const { chain, rpcUrl } = useSettings()
  const [blockNumber, setBlockNumber] = useUrlParam('block')
  const [result, setResult] = useState<ProbeResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const probe = async () => {
    setError('')
    setResult(null)
    const input = blockNumber.trim()
    if (!/^\d+$/.test(input)) {
      setError('Block number must be a non-negative integer.')
      return
    }
    setLoading(true)
    try {
      const client = createPublicClient({ transport: http(rpcUrl.trim()) })
      const block = await client.request<{
        Method: 'eth_getBlockByNumber'
        Parameters: [Hex, boolean]
        ReturnType: RawBlock | null
      }>({
        method: 'eth_getBlockByNumber',
        params: [numberToHex(BigInt(input)), false],
      })
      // Some nodes omit `result` instead of returning null — treat both as null.
      setResult(block == null ? { kind: 'null' } : { kind: 'block', block })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Section
      title="Block probe"
      description="Sends eth_getBlockByNumber to the RPC URL from Settings and shows what it returns (must allow browser/CORS requests)."
    >
      <label>Block number</label>
      <input
        value={blockNumber}
        onChange={(e) => setBlockNumber(e.target.value)}
        placeholder="e.g. 19000000"
        spellCheck={false}
      />
      <button type="button" onClick={probe} disabled={loading || !rpcUrl || !blockNumber}>
        {loading ? 'Probing…' : `Probe on ${chain.name}`}
      </button>
      {!rpcUrl && <p className="error">Set an RPC URL in Settings first.</p>}
      {error && <p className="error">{error}</p>}
      {result?.kind === 'null' && (
        <p className="error">
          RPC returned <code>null</code> — the block doesn't exist yet or this node has pruned it.
        </p>
      )}
      <BlockFields block={result?.kind === 'block' ? result.block : null} />
    </Section>
  )
}

/** Props for {@link BlockFields}. */
type BlockFieldsProps = {
  /** Raw block returned by the RPC; null renders the fields empty. */
  block: RawBlock | null
}

/** Formats and renders the fields of a raw block. Always rendered so the card height stays stable. */
function BlockFields({ block }: BlockFieldsProps) {
  const show = (format: (b: RawBlock) => string) => (block ? format(block) : '')
  return (
    <>
      <CopyField singleLine label="Number" value={show((b) => hexToBigInt(b.number).toString())} />
      <CopyField singleLine label="Hash" value={show((b) => b.hash ?? '(pending — no hash yet)')} />
      <CopyField singleLine label="Parent hash" value={show((b) => b.parentHash)} />
      <CopyField singleLine label="Timestamp" value={show((b) => formatTimestamp(b.timestamp))} />
      <CopyField singleLine label="Miner" value={show((b) => b.miner)} />
      <CopyField
        singleLine
        label="Gas used / limit"
        value={show((b) => `${hexToBigInt(b.gasUsed).toString()} / ${hexToBigInt(b.gasLimit).toString()}`)}
      />
      <CopyField
        singleLine
        label="Base fee"
        value={show((b) =>
          b.baseFeePerGas ? `${formatGwei(hexToBigInt(b.baseFeePerGas))} gwei` : '(pre-EIP-1559)',
        )}
      />
      <CopyField singleLine label="Transactions" value={show((b) => b.transactions.length.toString())} />
    </>
  )
}

/** Renders a hex Unix timestamp as `<seconds> (<ISO date>)`. */
function formatTimestamp(timestamp: Hex): string {
  const seconds = hexToBigInt(timestamp)
  return `${seconds} (${new Date(Number(seconds) * 1000).toISOString()})`
}
