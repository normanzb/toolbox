/** One authenticator account extracted from an otpauth or otpauth-migration URI. */
export type OtpAccount = {
  /** Base32 authenticator key. */
  secret: string
  name: string
  issuer: string
  /** Non-default settings worth showing, e.g. "8 digits"; empty for Google Authenticator defaults. */
  settings: string[]
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
export function decodeMigration(input: string): OtpAccount[] {
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
        settings: [],
      }
    })
}


/** Decodes percent-escapes repeatedly, since some issuers encode the label twice (%2520). */
function decodeAll(value: string): string {
  let current = value
  for (let i = 0; i < 3 && /%[0-9a-f]{2}/i.test(current); i++) {
    current = decodeURIComponent(current)
  }
  return current
}

/** Parses an otpauth://totp or otpauth://hotp key URI (the QR shown when you first set up 2FA). */
export function parseOtpauth(input: string): OtpAccount {
  const url = new URL(input.trim())
  const params = url.searchParams
  const secret = (params.get('secret') ?? '').toUpperCase().replace(/[\s=]/g, '')
  if (!secret) throw new Error('Missing secret param')
  if (!/^[A-Z2-7]+$/.test(secret)) throw new Error('Secret is not base32')

  // The label is "Issuer:account" or just "account".
  const label = decodeAll(url.pathname.replace(/^\//, ''))
  const colon = label.indexOf(':')
  const labelIssuer = colon < 0 ? '' : label.slice(0, colon).trim()
  const name = (colon < 0 ? label : label.slice(colon + 1)).trim()

  // An issuer form-encoded twice arrives as "Agora+Platform"; restore its spaces.
  const rawIssuer = decodeAll(params.get('issuer') ?? '')
  const isDoubleEncoded = rawIssuer.includes('+') && !rawIssuer.includes(' ')
  const issuer = (isDoubleEncoded ? rawIssuer.replaceAll('+', ' ') : rawIssuer) || labelIssuer

  // Only list what differs from the defaults the code generator assumes.
  const settings = []
  const type = url.host.toLowerCase()
  if (type !== 'totp') settings.push(`type ${type}`)
  const algorithm = (params.get('algorithm') ?? 'SHA1').toUpperCase()
  if (algorithm !== 'SHA1') settings.push(algorithm)
  const digits = params.get('digits') ?? '6'
  if (digits !== '6') settings.push(`${digits} digits`)
  const period = params.get('period') ?? '30'
  if (period !== '30') settings.push(`${period}s period`)

  return { secret, name, issuer, settings }
}

/** Extracts accounts from either authenticator URI format. */
export function parseOtpUri(input: string): OtpAccount[] {
  const scheme = input.trim().split(':')[0].toLowerCase()
  if (scheme === 'otpauth') return [parseOtpauth(input)]
  if (scheme === 'otpauth-migration') return decodeMigration(input)
  throw new Error('Expected an otpauth:// or otpauth-migration:// URI')
}
