import { useState } from 'react'
import { createPublicClient, formatGwei, hexToBigInt, http, type Hex } from 'viem'
import { CHAINS } from '../chains'
import CopyField from '../components/CopyField'
import Section from '../components/Section'
import { useSettings } from '../settings'
import { useUrlParam } from '../urlState'

/** One probed JSON-RPC method and how to render its result. */
type Probe = {
  label: string
  method: string
  params?: unknown[]
  format: (result: unknown) => string
}

const toDec = (r: unknown) => hexToBigInt(r as Hex).toString()
const toGwei = (r: unknown) => `${formatGwei(hexToBigInt(r as Hex))} gwei`

const PROBES: Probe[] = [
  {
    label: 'Chain ID (eth_chainId)',
    method: 'eth_chainId',
    format: (r) => {
      const id = Number(hexToBigInt(r as Hex))
      const known = CHAINS.find((c) => c.id === id)
      return known ? `${id} (${known.name})` : `${id}`
    },
  },
  { label: 'Network ID (net_version)', method: 'net_version', format: String },
  { label: 'Client (web3_clientVersion)', method: 'web3_clientVersion', format: String },
  { label: 'Head block (eth_blockNumber)', method: 'eth_blockNumber', format: toDec },
  {
    label: 'Syncing (eth_syncing)',
    method: 'eth_syncing',
    format: (r) => (r === false ? 'no' : JSON.stringify(r)),
  },
  {
    label: 'Genesis hash',
    method: 'eth_getBlockByNumber',
    params: ['0x0', false],
    format: (r) => (r as { hash?: string } | null)?.hash ?? '(genesis block not served)',
  },
  { label: 'Gas price (eth_gasPrice)', method: 'eth_gasPrice', format: toGwei },
  {
    label: 'Priority fee (eth_maxPriorityFeePerGas)',
    method: 'eth_maxPriorityFeePerGas',
    format: toGwei,
  },
  { label: 'Peers (net_peerCount)', method: 'net_peerCount', format: toDec },
]

type ProbeOutcome = { label: string; value: string }

/** Probes an unknown RPC node with standard read-only methods and shows each answer. */
export default function RpcInfoTool() {
  const { rpcUrl: settingsRpcUrl } = useSettings()
  const [rpcUrl, setRpcUrl] = useUrlParam('probe-rpc')
  const [results, setResults] = useState<ProbeOutcome[] | null>(null)
  const [loading, setLoading] = useState(false)
  const target = rpcUrl.trim() || settingsRpcUrl.trim()

  const probe = async () => {
    setResults(null)
    setLoading(true)
    const client = createPublicClient({ transport: http(target, { retryCount: 0 }) })
    // allSettled: a node rejecting one method shouldn't hide the others.
    const settled = await Promise.allSettled(
      PROBES.map((p) =>
        client.request({ method: p.method as 'eth_chainId', params: p.params as undefined }),
      ),
    )
    setResults(
      settled.map((s, i) => {
        const p = PROBES[i]
        if (s.status === 'rejected') {
          const message = s.reason instanceof Error ? s.reason.message.split('\n')[0] : String(s.reason)
          return { label: p.label, value: `✗ ${message}` }
        }
        try {
          return { label: p.label, value: p.format(s.value) }
        } catch {
          return { label: p.label, value: JSON.stringify(s.value) }
        }
      }),
    )
    setLoading(false)
  }

  return (
    <Section
      title="RPC node info"
      description="Probes an RPC node with standard read-only methods: chain ID, client, head, sync state, genesis, fees. The node must allow browser (CORS) requests."
    >
      <label>RPC URL</label>
      <input
        value={rpcUrl}
        onChange={(e) => setRpcUrl(e.target.value)}
        placeholder={settingsRpcUrl || 'https://…'}
        spellCheck={false}
        autoComplete="off"
      />
      <button type="button" onClick={probe} disabled={loading || !target}>
        {loading ? 'Probing…' : 'Probe node'}
      </button>
      {results?.every((r) => r.value.startsWith('✗')) && (
        <p className="error">
          No method answered. Check the URL, that the node allows CORS, and that an https page
          isn't calling an http:// node.
        </p>
      )}
      {/* Always rendered so the card height stays stable. */}
      {PROBES.map((p, i) => (
        <CopyField key={p.label} singleLine label={p.label} value={results?.[i].value ?? ''} />
      ))}
    </Section>
  )
}
