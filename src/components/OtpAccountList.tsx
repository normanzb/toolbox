import type { OtpAccount } from '../otp'
import CopyField from './CopyField'

/** Props for {@link OtpAccountList}. */
type OtpAccountListProps = {
  accounts: OtpAccount[]
}

/** Shows each account's authenticator key, labeled by issuer, name and any non-default settings. */
export default function OtpAccountList({ accounts }: OtpAccountListProps) {
  return accounts.map((a, i) => {
    const title = [a.issuer, a.name].filter(Boolean).join(' · ') || `Account ${i + 1}`
    const settings = a.settings.length ? ` (${a.settings.join(', ')})` : ''
    return <CopyField key={i} label={`${title}${settings}`} value={a.secret} />
  })
}
