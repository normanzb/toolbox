import { useState } from 'react'
import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  parseAbi,
  type Hex,
} from 'viem'
import CopyField from '../components/CopyField'
import Section from '../components/Section'
import { useSettings } from '../settings'

const SLOTS = {
  // bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)
  implementation: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
  // bytes32(uint256(keccak256('eip1967.proxy.beacon')) - 1)
  beacon: '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50',
  // bytes32(uint256(keccak256('eip1967.proxy.admin')) - 1)
  admin: '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103',
} as const

type Result = {
  implementation: string
  beacon: string
  beaconImplementation: string
  admin: string
}

/** Resolves a proxy's EIP-1967 storage slots (implementation, beacon, admin) via JSON-RPC. */
export default function Eip1967Tool() {
  const { chain, rpcUrl } = useSettings()
  const [proxy, setProxy] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const resolve = async () => {
    setError('')
    setResult(null)
    if (!isAddress(proxy.trim())) {
      setError('Invalid proxy address.')
      return
    }
    setLoading(true)
    try {
      const client = createPublicClient({ transport: http(rpcUrl.trim()) })
      const address = getAddress(proxy.trim())
      const [implementation, beacon, admin] = await Promise.all([
        client.getStorageAt({ address, slot: SLOTS.implementation }),
        client.getStorageAt({ address, slot: SLOTS.beacon }),
        client.getStorageAt({ address, slot: SLOTS.admin }),
      ])
      const beaconAddress = slotToAddress(beacon)
      let beaconImplementation = ''
      if (beaconAddress) {
        beaconImplementation = await client.readContract({
          address: beaconAddress,
          abi: parseAbi(['function implementation() view returns (address)']),
          functionName: 'implementation',
        })
      }
      setResult({
        implementation: slotToAddress(implementation) ?? '',
        beacon: beaconAddress ?? '',
        beaconImplementation,
        admin: slotToAddress(admin) ?? '',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Section
      title="EIP-1967 proxy resolver"
      description="Reads the EIP-1967 implementation, beacon, and admin slots of a proxy contract via the RPC URL from Settings (must allow browser/CORS requests)."
    >
      <label>Proxy address</label>
      <input
        value={proxy}
        onChange={(e) => setProxy(e.target.value)}
        placeholder="0x…"
        spellCheck={false}
      />
      <button type="button" onClick={resolve} disabled={loading || !rpcUrl || !proxy}>
        {loading ? 'Resolving…' : `Resolve on ${chain.name}`}
      </button>
      {!rpcUrl && <p className="error">Set an RPC URL in Settings first.</p>}
      {error && <p className="error">{error}</p>}
      {result && (
        <>
          <CopyField label="Implementation" value={result.implementation} />
          <CopyField label="Beacon" value={result.beacon} />
          {result.beacon && (
            <CopyField label="Beacon implementation()" value={result.beaconImplementation} />
          )}
          <CopyField label="Admin" value={result.admin} />
        </>
      )}
    </Section>
  )
}

/** Extracts the address from a 32-byte storage slot value; null when unset. */
function slotToAddress(slot: Hex | undefined): `0x${string}` | null {
  if (!slot || /^0x0*$/.test(slot)) return null
  const address = `0x${slot.slice(-40)}`
  return isAddress(address) && !/^0x0{40}$/.test(address) ? getAddress(address) : null
}
