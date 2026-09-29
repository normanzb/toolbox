import { useMemo, useState } from 'react'
import CopyField from '../components/CopyField'
import Section from '../components/Section'

/** One account from a Google Authenticator export. */
type OtpAccount = {
  /** Base32 authenticator key. */
  secret: string
  name: string
  issuer: string
}

/** Reads a protobuf varint at `pos`; returns the value and the next position. */
function readVarint(bytes: Uint8Array, pos: number): [number, number] {
  let value = 0
  let shift = 0
  while (pos < bytes.length) {
    const byte = bytes[pos++]
    value += (byte & 0x7f) * 2 ** shift
    if (!(byte & 0x80)) return [value, pos]
    shift += 7
  }
  throw new Error('Truncated varint')
}

/** Splits a protobuf message into its fields; varints as numbers, length-delimited as bytes. */
function readFields(bytes: Uint8Array): { field: number; value: number | Uint8Array }[] {
  const fields: { field: number; value: number | Uint8Array }[] = []
  let pos = 0
  while (pos < bytes.length) {
    const [tag, afterTag] = readVarint(bytes, pos)
    const field = Math.floor(tag / 8)
    const wireType = tag & 7
    pos = afterTag
    if (wireType === 0) {
      const [value, next] = readVarint(bytes, pos)
      fields.push({ field, value })
      pos = next
    } else if (wireType === 2) {
      const [length, start] = readVarint(bytes, pos)
      if (start + length > bytes.length) throw new Error('Truncated field')
      fields.push({ field, value: bytes.subarray(start, start + length) })
      pos = start + length
    } else if (wireType === 1) pos += 8
    else if (wireType === 5) pos += 4
    else throw new Error(`Unsupported wire type ${wireType}`)
  }
  return fields
}

/** RFC 4648 base32 without padding, the form authenticator apps accept. */
function base32(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let out = ''
  let buffer = 0
  let bits = 0
  for (const byte of bytes) {
    buffer = ((buffer << 8) | byte) & 0xfff
    bits += 8
    while (bits >= 5) {
      out += alphabet[(buffer >> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += alphabet[(buffer << (5 - bits)) & 31]
  return out
}

/**
 * Decodes an otpauth-migration URL. Payload is a MigrationPayload protobuf whose
 * field 1 repeats OtpParameters { 1: secret, 2: name, 3: issuer }.
 */
function decodeMigration(input: string): OtpAccount[] {
  const data = new URL(input.trim()).searchParams.get('data')
  if (!data) throw new Error('Missing data param')
  // get() decodes an unescaped base64 '+' as a space; restore it.
  const b64 = data.replaceAll(' ', '+')
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  const text = new TextDecoder()
  return readFields(bytes)
    .filter((f) => f.field === 1 && f.value instanceof Uint8Array)
    .map((f) => {
      const params = readFields(f.value as Uint8Array)
      const get = (n: number) => params.find((p) => p.field === n)?.value
      const secret = get(1)
      if (!(secret instanceof Uint8Array)) throw new Error('Account has no secret')
      const name = get(2)
      const issuer = get(3)
      return {
        secret: base32(secret),
        name: name instanceof Uint8Array ? text.decode(name) : '',
        issuer: issuer instanceof Uint8Array ? text.decode(issuer) : '',
      }
    })
}

/** Extracts authenticator keys from a Google Authenticator export QR URL. */
export default function AuthenticatorMigrationTool() {
  // Not URL-synced: the payload holds live 2FA secrets.
  const [input, setInput] = useState('')

  const result = useMemo(() => {
    if (!input.trim()) return null
    try {
      const accounts = decodeMigration(input)
      return accounts.length ? { accounts } : { error: 'No accounts in payload' }
    } catch (e) {
      return { error: `Invalid migration URL: ${(e as Error).message}` }
    }
  }, [input])

  return (
    <Section
      title="Authenticator export decoder"
      description="Decodes a Google Authenticator export QR (otpauth-migration://offline?data=…) into base32 authenticator keys."
    >
      <label>Migration URL</label>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="otpauth-migration://offline?data=…"
        spellCheck={false}
        autoComplete="off"
      />
      {result?.error && <p className="error">{result.error}</p>}
      {result?.accounts?.map((a, i) => (
        <CopyField
          key={i}
          label={[a.issuer, a.name].filter(Boolean).join(' · ') || `Account ${i + 1}`}
          value={a.secret}
        />
      ))}
    </Section>
  )
}
