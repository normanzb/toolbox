import { useEffect, useState } from 'react'
import CopyField from '../components/CopyField'
import Section from '../components/Section'

const PERIOD = 30

/** Decodes RFC 4648 base32, ignoring case, spaces, and padding. */
function base32Decode(input: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const clean = input.toUpperCase().replace(/[\s=]/g, '')
  const out: number[] = []
  let buffer = 0
  let bits = 0
  for (const char of clean) {
    const index = alphabet.indexOf(char)
    if (index < 0) throw new Error(`Invalid base32 character "${char}"`)
    buffer = ((buffer << 5) | index) & 0xfff
    bits += 5
    if (bits >= 8) {
      out.push((buffer >> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(out)
}

/** RFC 6238 TOTP: HMAC-SHA1, 6 digits, 30s period (Google Authenticator defaults). */
async function totp(key: Uint8Array, counter: number): Promise<string> {
  const message = new DataView(new ArrayBuffer(8))
  message.setUint32(0, Math.floor(counter / 2 ** 32))
  message.setUint32(4, counter >>> 0)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, message))
  const offset = hmac[hmac.length - 1] & 0xf
  const code = new DataView(hmac.buffer).getUint32(offset) & 0x7fffffff
  return (code % 1_000_000).toString().padStart(6, '0')
}

/** Current Unix time in seconds, refreshed every second. */
function useNowSeconds(): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

/** Generates the live 6-digit code for a base32 authenticator key. */
export default function TotpTool() {
  // Not URL-synced: the key is a live 2FA secret.
  const [secret, setSecret] = useState('')
  const [result, setResult] = useState<{ code: string } | { error: string } | null>(null)
  const now = useNowSeconds()
  const counter = Math.floor(now / PERIOD)

  useEffect(() => {
    if (!secret.trim()) {
      setResult(null)
      return
    }
    let cancelled = false
    try {
      const key = base32Decode(secret)
      if (!key.length) throw new Error('Key is empty')
      totp(key, counter).then(
        (code) => !cancelled && setResult({ code }),
        (e: Error) => !cancelled && setResult({ error: e.message }),
      )
    } catch (e) {
      setResult({ error: (e as Error).message })
    }
    return () => {
      cancelled = true
    }
  }, [secret, counter])

  return (
    <Section
      title="Authenticator code"
      description="Generates the current 6-digit TOTP code (SHA-1, 30s) from a base32 authenticator key."
    >
      <label>Authenticator key</label>
      <input
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        placeholder="JBSWY3DPEHPK3PXP"
        spellCheck={false}
        autoComplete="off"
      />
      {result && 'error' in result && <p className="error">{result.error}</p>}
      {result && 'code' in result && (
        <>
          <CopyField label="Code" value={result.code} />
          <p className="totp-countdown">Refreshes in {PERIOD - (now % PERIOD)}s</p>
        </>
      )}
    </Section>
  )
}
