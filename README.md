# Ethereum Toolbox

A client-side Ethereum developer toolbox built with React + Vite + [viem](https://viem.sh), deployable to GitHub Pages.

## Tools

- **Private key / public key / address** — generate a random private key, or paste one to derive its uncompressed public key and address
- **Sign** — sign an EIP-191 personal message or a raw 32-byte hash with the key from the private key card
- **Keccak-256** — hash text or hex bytes; shows the 4-byte selector, e.g. `keccak256("MintPaused()")[0:4] = 0xd7d248ba`
- **EIP-1967 proxy resolver** — read a proxy's implementation, beacon, and admin slots via any CORS-enabled JSON-RPC endpoint
- **Contract caller** — read or write any contract function: paste an address + ABI and fill typed argument fields, or pick a preset (grant/revoke/check the `APPROVED_SWAPPER` role). Writes are signed by an injected wallet or a pasted private key
- **RPC node info** — probe an unknown node: chain ID, network ID, client version, head, sync state, genesis hash, fees, peers

### 2FA Toolbox (`/2fa/`)

- **Authenticator code** — paste a base32 authenticator key to get the live 6-digit TOTP code
- **Authenticator export decoder** — paste a Google Authenticator export URL (`otpauth-migration://offline?data=…`) to get each account's base32 authenticator key

### Foundry cheatsheet (`/cheatsheet/`)

Filterable, copyable cast / anvil / forge commands: probing nodes, simulating transfers, forking mainnet with a custom chain ID, impersonation and other anvil state tricks.

All cryptography runs locally in the browser. Still, don't paste private keys that hold real funds — the contract caller's write path can use an admin key, so prefer the injected wallet.

## Development

```bash
pnpm install
pnpm dev       # dev server
pnpm build     # type-check + production build to dist/
pnpm preview   # preview the production build
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the app and deploys it to GitHub Pages. In the repo settings, set **Pages → Source** to **GitHub Actions**.
