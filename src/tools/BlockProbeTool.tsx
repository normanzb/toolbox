import { useState } from 'react'
import { createPublicClient, formatGwei, hexToBigInt, http, numberToHex, type Hex } from 'viem'
import CopyField from '../components/CopyField'
import Section from '../components/Section'
import { useSettings } from '../settings'

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
  const [blockNumber, setBlockNumber] = useState('')
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
      setResult(block === null ? { kind: 'null' } : { kind: 'block', block })
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
      {result?.kind === 'block' && <BlockFields block={result.block} />}
    </Section>
  )
}

/** Props for {@link BlockFields}. */
type BlockFieldsProps = {
  /** Raw block returned by the RPC. */
  block: RawBlock
}

/** Formats and renders the fields of a raw block. */
function BlockFields({ block }: BlockFieldsProps) {
  return (
    <>
      <CopyField label="Number" value={hexToBigInt(block.number).toString()} />
      <CopyField label="Hash" value={block.hash ?? '(pending — no hash yet)'} />
      <CopyField label="Parent hash" value={block.parentHash} />
      <CopyField label="Timestamp" value={formatTimestamp(block.timestamp)} />
      <CopyField label="Miner" value={block.miner} />
      <CopyField
        label="Gas used / limit"
        value={`${hexToBigInt(block.gasUsed).toString()} / ${hexToBigInt(block.gasLimit).toString()}`}
      />
      <CopyField
        label="Base fee"
        value={block.baseFeePerGas ? `${formatGwei(hexToBigInt(block.baseFeePerGas))} gwei` : '(pre-EIP-1559)'}
      />
      <CopyField label="Transactions" value={block.transactions.length.toString()} />
    </>
  )
}

/** Renders a hex Unix timestamp as `<seconds> (<ISO date>)`. */
function formatTimestamp(timestamp: Hex): string {
  const seconds = hexToBigInt(timestamp)
  return `${seconds} (${new Date(Number(seconds) * 1000).toISOString()})`
}
