import { useMemo, useState } from 'react'
import {
  type Abi,
  type AbiFunction,
  type Address,
  createPublicClient,
  createWalletClient,
  custom,
  decodeFunctionResult,
  defineChain,
  type EIP1193Provider,
  encodeFunctionData,
  getAddress,
  http,
  isAddress,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { bigintReplacer, parseAbiInput } from '../abi'
import CopyField from '../components/CopyField'
import Section from '../components/Section'
import type { Chain } from '../chains'
import { useSettings } from '../settings'
import { useUrlParam } from '../urlState'
import { findPreset, PRESETS } from './presets'

declare global {
  interface Window {
    ethereum?: EIP1193Provider
  }
}

type SignerMode = 'injected' | 'privatekey'

type Output = {
  /** Read result, pretty-printed. */
  result?: string
  /** Write transaction hash. */
  txHash?: string
  /** Write receipt status. */
  status?: string
}

/**
 * Calls any contract function — read (eth_call) or write (signed tx) — against an
 * address + ABI, or via a built-in preset (grant/revoke/check APPROVED_SWAPPER).
 */
export default function ContractCallTool() {
  const { chain, rpcUrl } = useSettings()
  const [presetId, setPresetId] = useUrlParam('cc-preset')
  const [address, setAddress] = useUrlParam('cc-addr')
  const [customAbi, setCustomAbi] = useUrlParam('cc-abi')
  const [customFn, setCustomFn] = useUrlParam('cc-fn')
  const [argsRaw, setArgsRaw] = useUrlParam('cc-args')
  const [signerMode, setSignerMode] = useState<SignerMode>('injected')
  const [privateKey, setPrivateKey] = useState('')
  const [output, setOutput] = useState<Output | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const preset = findPreset(presetId)
  const abiText = preset ? preset.abi : customAbi

  const { parsedAbi, abiError } = useMemo<{ parsedAbi?: Abi; abiError?: string }>(() => {
    if (!abiText.trim()) return {}
    try {
      return { parsedAbi: parseAbiInput(abiText) }
    } catch (e) {
      return { abiError: `Invalid ABI: ${e instanceof Error ? e.message : String(e)}` }
    }
  }, [abiText])

  const functions = useMemo(
    () => (parsedAbi?.filter((item): item is AbiFunction => item.type === 'function') ?? []),
    [parsedAbi],
  )

  const fnName = preset ? preset.functionName : customFn || functions[0]?.name || ''
  const fnAbi = functions.find((f) => f.name === fnName)

  const argValues = useMemo<string[]>(() => {
    try {
      const v = JSON.parse(argsRaw)
      return Array.isArray(v) ? v.map(String) : []
    } catch {
      return []
    }
  }, [argsRaw])

  const setArgValue = (index: number, value: string) => {
    const next = [...argValues]
    next[index] = value
    setArgsRaw(JSON.stringify(next))
  }

  const fields = preset
    ? preset.fields
    : (fnAbi?.inputs ?? []).map((input, i) => ({
        label: `${input.name || `arg${i}`} (${input.type})`,
        placeholder: placeholderFor(input.type),
      }))

  const isWrite = preset
    ? preset.kind === 'write'
    : fnAbi?.stateMutability === 'nonpayable' || fnAbi?.stateMutability === 'payable'

  const run = async () => {
    setError('')
    setOutput(null)

    if (!isAddress(address.trim())) {
      setError('Invalid contract address.')
      return
    }
    if (!parsedAbi || !fnAbi) {
      setError('Provide an ABI and select a function.')
      return
    }

    let args: unknown[]
    try {
      args = preset
        ? preset.buildArgs(argValues)
        : (fnAbi.inputs ?? []).map((input, i) => coerceArg(input.type, argValues[i] ?? ''))
    } catch (e) {
      setError(`Bad argument: ${e instanceof Error ? e.message : String(e)}`)
      return
    }

    setLoading(true)
    try {
      const to = getAddress(address.trim())
      const data = encodeFunctionData({ abi: parsedAbi, functionName: fnName, args })
      const viemChain = toViemChain(chain, rpcUrl)
      const pub = createPublicClient({ chain: viemChain, transport: http(rpcUrl.trim()) })

      if (!isWrite) {
        const { data: ret } = await pub.call({ to, data })
        const decoded =
          fnAbi.outputs && fnAbi.outputs.length > 0 && ret
            ? decodeFunctionResult({ abi: parsedAbi, functionName: fnName, data: ret })
            : '(no return value)'
        setOutput({ result: JSON.stringify(decoded, bigintReplacer, 2) })
        return
      }

      const walletClient = await getWalletClient(signerMode, privateKey, viemChain, rpcUrl)
      const txHash = await walletClient.sendTransaction({ to, data })
      setOutput({ txHash })
      const receipt = await pub.waitForTransactionReceipt({ hash: txHash })
      setOutput({ txHash, status: receipt.status })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const onPresetChange = (id: string) => {
    setPresetId(id)
    setArgsRaw('')
    setOutput(null)
    setError('')
  }

  return (
    <Section
      title="Contract caller"
      description="Read or write any contract function via the RPC URL in Settings. Pick a preset, or choose Custom to paste an ABI and select a function. Writes need a signer — an injected wallet or a pasted private key (never stored, never put in the URL)."
    >
      <label>Preset</label>
      <select value={presetId} onChange={(e) => onPresetChange(e.target.value)}>
        <option value="">Custom</option>
        {PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

      <label>Contract address</label>
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="0x… (pair address on Sepolia)"
        spellCheck={false}
      />

      {!preset && (
        <>
          <label>ABI (human-readable signatures or JSON)</label>
          <textarea
            value={customAbi}
            onChange={(e) => setCustomAbi(e.target.value)}
            rows={3}
            placeholder={'function setApprovedSwappers(address[] _swappers, bool _approved)'}
            spellCheck={false}
          />
          {abiError && <p className="error">{abiError}</p>}
          {functions.length > 0 && (
            <>
              <label>Function</label>
              <select value={fnName} onChange={(e) => setCustomFn(e.target.value)}>
                {functions.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name} ({f.stateMutability})
                  </option>
                ))}
              </select>
            </>
          )}
        </>
      )}

      {fields.map((field, i) => (
        <div key={field.label}>
          <label>{field.label}</label>
          <input
            value={argValues[i] ?? ''}
            onChange={(e) => setArgValue(i, e.target.value)}
            placeholder={field.placeholder}
            spellCheck={false}
          />
        </div>
      ))}

      {isWrite && (
        <>
          <label>Signer</label>
          <select value={signerMode} onChange={(e) => setSignerMode(e.target.value as SignerMode)}>
            <option value="injected">Injected wallet (window.ethereum)</option>
            <option value="privatekey">Private key</option>
          </select>
          {signerMode === 'privatekey' && (
            <>
              <label>Private key (not stored, not shared)</label>
              <input
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="0x…"
                spellCheck={false}
                type="password"
              />
            </>
          )}
        </>
      )}

      <button type="button" onClick={run} disabled={loading || !rpcUrl}>
        {loading
          ? isWrite
            ? 'Sending…'
            : 'Reading…'
          : `${isWrite ? 'Write' : 'Read'} on ${chain.name}`}
      </button>
      {!rpcUrl && <p className="error">Set an RPC URL in Settings first.</p>}
      {error && <p className="error">{error}</p>}

      {output?.result !== undefined && <CopyField label="Result" value={output.result} />}
      {output?.txHash && <CopyField label="Transaction hash" value={output.txHash} />}
      {output?.status && <CopyField label="Status" value={output.status} />}
    </Section>
  )
}

/** Builds a minimal viem Chain from the app's chain config + the active RPC URL. */
function toViemChain(chain: Chain, rpcUrl: string) {
  return defineChain({
    id: chain.id,
    name: chain.name,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl.trim()] } },
  })
}

/** Creates a wallet client for the chosen signer mode. */
async function getWalletClient(
  mode: SignerMode,
  privateKey: string,
  viemChain: ReturnType<typeof toViemChain>,
  rpcUrl: string,
) {
  if (mode === 'privatekey') {
    const account = privateKeyToAccount(privateKey.trim() as `0x${string}`)
    return createWalletClient({ account, chain: viemChain, transport: http(rpcUrl.trim()) })
  }
  const provider = window.ethereum
  if (!provider) throw new Error('No injected wallet found (window.ethereum).')
  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
  const account = getAddress(accounts[0]) as Address
  const walletClient = createWalletClient({ account, chain: viemChain, transport: custom(provider) })
  // Best-effort: ask the wallet to switch to the active chain. Errors (chain not added,
  // user already on it) are non-fatal; sendTransaction surfaces a real mismatch.
  try {
    await walletClient.switchChain({ id: viemChain.id })
  } catch {
    // ignore
  }
  return walletClient
}

/** Coerces a text input into the JS value viem expects for the given ABI type. */
function coerceArg(type: string, raw: string): unknown {
  const text = raw.trim()
  if (type.endsWith(']') || type.startsWith('tuple')) {
    return JSON.parse(text)
  }
  if (type === 'bool') {
    if (text === 'true') return true
    if (text === 'false') return false
    throw new Error(`expected "true" or "false" for ${type}, got "${text}"`)
  }
  if (/^u?int\d*$/.test(type)) {
    return BigInt(text)
  }
  // address, string, bytes, bytesN, etc. — pass through as a string.
  return text
}

/** A friendly placeholder for an ABI input type. */
function placeholderFor(type: string): string {
  if (type.endsWith(']')) return '["0x…", "0x…"]'
  if (type.startsWith('tuple')) return '[...]'
  if (type === 'bool') return 'true'
  if (/^u?int\d*$/.test(type)) return '0'
  if (type === 'address') return '0x…'
  return ''
}
