import { useMemo } from 'react'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import CopyField from '../components/CopyField'
import CopyInput from '../components/CopyInput'
import Section from '../components/Section'
import { useUrlParam } from '../urlState'

/** Generates a random private key, or derives public key + address from a pasted one. */
export default function KeyTool() {
  const [privateKey, setPrivateKey] = useUrlParam('pk')

  const derived = useMemo(() => {
    if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey.trim())) return null
    try {
      const account = privateKeyToAccount(privateKey.trim() as `0x${string}`)
      return { publicKey: account.publicKey, address: account.address }
    } catch {
      return null
    }
  }, [privateKey])

  return (
    <Section
      title="Private key / public key / address"
      description="Generate a random private key, or paste one to derive its public key and address. Everything runs locally in your browser."
    >
      <button type="button" onClick={() => setPrivateKey(generatePrivateKey())}>
        Generate random private key
      </button>
      <CopyInput
        label="Private key (0x + 64 hex chars)"
        value={privateKey}
        onChange={setPrivateKey}
        placeholder="0x…"
      />
      {privateKey && !derived && <p className="error">Invalid private key.</p>}
      <CopyField label="Public key (uncompressed)" value={derived?.publicKey ?? ''} />
      <CopyField label="Address" value={derived?.address ?? ''} />
    </Section>
  )
}
