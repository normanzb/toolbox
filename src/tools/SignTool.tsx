import { useState } from 'react'
import { privateKeyToAccount, sign } from 'viem/accounts'
import CopyField from '../components/CopyField'
import Section from '../components/Section'

type Mode = 'message' | 'hash'

/** Signs an EIP-191 personal message or a raw 32-byte hash with a private key. */
export default function SignTool() {
  const [privateKey, setPrivateKey] = useState('')
  const [mode, setMode] = useState<Mode>('message')
  const [payload, setPayload] = useState('')
  const [signature, setSignature] = useState('')
  const [error, setError] = useState('')

  const doSign = async () => {
    setError('')
    setSignature('')
    try {
      const pk = privateKey.trim() as `0x${string}`
      if (mode === 'message') {
        const account = privateKeyToAccount(pk)
        setSignature(await account.signMessage({ message: payload }))
      } else {
        const hash = payload.trim()
        if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
          throw new Error('Raw hash must be 0x + 64 hex chars.')
        }
        setSignature(await sign({ hash: hash as `0x${string}`, privateKey: pk, to: 'hex' }))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Section
      title="Sign"
      description="Sign with a private key. Message mode uses EIP-191 personal_sign; raw mode signs a 32-byte hash directly."
    >
      <label>Private key</label>
      <input
        value={privateKey}
        onChange={(e) => setPrivateKey(e.target.value)}
        placeholder="0x…"
        spellCheck={false}
      />
      <label>Mode</label>
      <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
        <option value="message">Personal message (EIP-191)</option>
        <option value="hash">Raw 32-byte hash</option>
      </select>
      <label>{mode === 'message' ? 'Message' : 'Hash (0x + 64 hex chars)'}</label>
      <textarea
        value={payload}
        onChange={(e) => setPayload(e.target.value)}
        rows={3}
        placeholder={mode === 'message' ? 'hello world' : '0x…'}
        spellCheck={false}
      />
      <button type="button" onClick={doSign}>
        Sign
      </button>
      {error && <p className="error">{error}</p>}
      <CopyField label="Signature" value={signature} />
    </Section>
  )
}
