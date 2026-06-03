/** A supported EVM chain with its default public RPC endpoint. */
export type Chain = {
  /** EIP-155 chain id. */
  id: number
  /** Display name. */
  name: string
  /** Default CORS-enabled public RPC URL. */
  rpcUrl: string
}

/** Popular EVM chains, alphabetical. */
export const CHAINS: Chain[] = [
  { id: 42161, name: 'Arbitrum One', rpcUrl: 'https://arbitrum-one-rpc.publicnode.com' },
  { id: 43114, name: 'Avalanche C-Chain', rpcUrl: 'https://avalanche-c-chain-rpc.publicnode.com' },
  { id: 8453, name: 'Base', rpcUrl: 'https://base-rpc.publicnode.com' },
  { id: 56, name: 'BNB Smart Chain', rpcUrl: 'https://bsc-rpc.publicnode.com' },
  { id: 1, name: 'Ethereum', rpcUrl: 'https://ethereum-rpc.publicnode.com' },
  { id: 100, name: 'Gnosis', rpcUrl: 'https://gnosis-rpc.publicnode.com' },
  { id: 59144, name: 'Linea', rpcUrl: 'https://linea-rpc.publicnode.com' },
  { id: 10, name: 'OP Mainnet', rpcUrl: 'https://optimism-rpc.publicnode.com' },
  { id: 137, name: 'Polygon', rpcUrl: 'https://polygon-bor-rpc.publicnode.com' },
  { id: 534352, name: 'Scroll', rpcUrl: 'https://scroll-rpc.publicnode.com' },
  { id: 11155111, name: 'Sepolia (testnet)', rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com' },
  { id: 324, name: 'zkSync Era', rpcUrl: 'https://mainnet.era.zksync.io' },
]
