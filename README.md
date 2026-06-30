# Ethereum Toolbox

A client-side Ethereum developer toolbox built with React + Vite + [viem](https://viem.sh), deployable to GitHub Pages.

## Tools

- **Private key / public key / address** — generate a random private key, or paste one to derive its uncompressed public key and address
- **Sign** — sign an EIP-191 personal message or a raw 32-byte hash
- **Keccak-256** — hash text or hex bytes; shows the 4-byte selector, e.g. `keccak256("MintPaused()")[0:4] = 0xd7d248ba`
- **EIP-1967 proxy resolver** — read a proxy's implementation, beacon, and admin slots via any CORS-enabled JSON-RPC endpoint
- **Contract caller** — read or write any contract function: paste an address + ABI and fill typed argument fields, or pick a preset (grant/revoke/check the `APPROVED_SWAPPER` role). Writes are signed by an injected wallet or a pasted private key

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
