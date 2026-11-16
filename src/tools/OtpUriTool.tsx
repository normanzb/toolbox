import { useMemo } from 'react'
import OtpAccountList from '../components/OtpAccountList'
import Section from '../components/Section'
import { parseOtpUri } from '../otp'

/** Props for {@link OtpUriTool}. */
type OtpUriToolProps = {
  /** URI text; owned by the page so the QR reader can fill it. Not URL-synced: it holds live 2FA secrets. */
  input: string
  setInput: (input: string) => void
}

/** Extracts authenticator keys from an otpauth:// or Google Authenticator export URI. */
export default function OtpUriTool({ input, setInput }: OtpUriToolProps) {

  const result = useMemo(() => {
    if (!input.trim()) return null
    try {
      const accounts = parseOtpUri(input)
      return accounts.length ? { accounts } : { error: 'No accounts in payload' }
    } catch (e) {
      return { error: `Invalid URI: ${(e as Error).message}` }
    }
  }, [input])

  return (
    <Section
      title="Authenticator URI decoder"
      description="Extracts the base32 authenticator key from a 2FA setup URI (otpauth://totp/…) or a Google Authenticator export (otpauth-migration://offline?data=…)."
    >
      <label>URI</label>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="otpauth://totp/… or otpauth-migration://offline?data=…"
        spellCheck={false}
        autoComplete="off"
      />
      {result?.error && <p className="error">{result.error}</p>}
      {result?.accounts && <OtpAccountList accounts={result.accounts} />}
    </Section>
  )
}
