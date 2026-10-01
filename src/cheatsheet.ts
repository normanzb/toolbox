/** One copyable command with a short explanation. */
export type Command = {
  title: string
  cmd: string
  note?: string
}

/** A titled group of related commands. */
export type CommandGroup = {
  title: string
  description?: string
  commands: Command[]
}

/** Foundry (cast / anvil / forge) commands, in the order you typically reach for them. */
export const CHEATSHEET: CommandGroup[] = [
  {
    title: 'Setup',
    description: 'cast reads ETH_RPC_URL, so most commands below need no --rpc-url.',
    commands: [
      {
        title: 'Install / update Foundry',
        cmd: 'curl -L https://foundry.paradigm.xyz | bash && foundryup',
      },
      {
        title: 'Point cast at a node',
        cmd: 'export ETH_RPC_URL=https://ethereum-rpc.publicnode.com',
      },
      {
        title: 'Point cast at a local anvil',
        cmd: 'export ETH_RPC_URL=http://127.0.0.1:8545',
      },
      {
        title: 'Store a key in an encrypted keystore (instead of --private-key)',
        cmd: 'cast wallet import dev --interactive',
        note: 'Then pass --account dev to cast send / forge script.',
      },
    ],
  },
  {
    title: 'Probe a node',
    commands: [
      { title: 'Chain ID', cmd: 'cast chain-id' },
      { title: 'Chain name', cmd: 'cast chain' },
      { title: 'Client software and version', cmd: 'cast client' },
      { title: 'Head block number', cmd: 'cast block-number' },
      { title: 'Latest block, selected fields', cmd: 'cast block latest -f number,timestamp,baseFeePerGas' },
      { title: 'Gas price / base fee', cmd: 'cast gas-price && cast base-fee' },
      { title: 'Sync status', cmd: 'cast rpc eth_syncing' },
      { title: 'Genesis hash (identifies the network)', cmd: 'cast block 0 -f hash' },
      { title: 'Any raw JSON-RPC method', cmd: 'cast rpc net_version' },
      {
        title: 'Block closest to a timestamp',
        cmd: 'cast find-block 1700000000',
      },
    ],
  },
  {
    title: 'Accounts and contracts',
    commands: [
      { title: 'ETH balance', cmd: 'cast balance $ADDR --ether' },
      { title: 'Nonce', cmd: 'cast nonce $ADDR' },
      { title: 'Is it a contract? (bytecode size)', cmd: 'cast codesize $ADDR' },
      { title: 'Raw storage slot', cmd: 'cast storage $ADDR 0' },
      { title: 'EIP-1967 proxy implementation / admin', cmd: 'cast implementation $PROXY && cast admin $PROXY' },
      { title: 'ERC-20 balance', cmd: 'cast erc20-token balance $TOKEN $ADDR' },
      {
        title: 'ERC-20 metadata',
        cmd: 'cast erc20-token name $TOKEN && cast erc20-token symbol $TOKEN && cast erc20-token decimals $TOKEN',
      },
      { title: 'Call a view function', cmd: 'cast call $TOKEN "balanceOf(address)(uint256)" $ADDR' },
      { title: 'Call at a past block', cmd: 'cast call $TOKEN "totalSupply()(uint256)" --block 20000000' },
      {
        title: 'Verified source / interface from Etherscan',
        cmd: 'cast interface $ADDR',
        note: 'Needs ETHERSCAN_API_KEY.',
      },
    ],
  },
  {
    title: 'Simulate without sending',
    description: 'eth_call runs the transaction against current state and discards it.',
    commands: [
      {
        title: 'Simulate an ERC-20 transfer from any holder',
        cmd: 'cast call --from $HOLDER $TOKEN "transfer(address,uint256)(bool)" $TO 1000000',
      },
      {
        title: 'Simulate an ETH transfer from an unfunded address',
        cmd: 'cast call --from $FROM $TO --value 1ether --override-balance $FROM:10000000000000000000',
        note: '--override-balance is in wei; overrides apply to this call only.',
      },
      {
        title: 'Simulate with a full call trace',
        cmd: 'cast call --trace --from $FROM $TARGET "fn(uint256)" 1',
      },
      { title: 'Estimate gas', cmd: 'cast estimate --from $FROM $TOKEN "transfer(address,uint256)" $TO 1000000' },
      {
        title: 'Replay a mined transaction with a trace',
        cmd: 'cast run $TX_HASH',
        note: 'Needs an archive node for older blocks.',
      },
      {
        title: 'Simulate a forge script on a fork (no --broadcast)',
        cmd: 'forge script script/Deploy.s.sol --fork-url $ETH_RPC_URL --sender $FROM',
      },
    ],
  },
  {
    title: 'Start anvil',
    commands: [
      { title: 'Plain local chain (chain ID 31337, 10 funded accounts)', cmd: 'anvil' },
      {
        title: 'Fork mainnet with a custom chain ID',
        cmd: 'anvil --fork-url https://ethereum-rpc.publicnode.com --chain-id 1337',
        note: 'A distinct chain ID stops wallets from replaying signed txs on mainnet.',
      },
      {
        title: 'Fork pinned to a block (reproducible, cacheable)',
        cmd: 'anvil --fork-url $ETH_RPC_URL --fork-block-number 20000000',
        note: 'Old blocks need an archive RPC.',
      },
      {
        title: 'Fork with every address unlocked',
        cmd: 'anvil --fork-url $ETH_RPC_URL --auto-impersonate',
        note: 'Then cast send --from <anyone> --unlocked works without anvil_impersonateAccount.',
      },
      { title: 'Mine a block every 12s instead of per tx', cmd: 'anvil --block-time 12' },
      { title: 'Manual mining only', cmd: 'anvil --no-mining', note: 'Mine with cast rpc evm_mine.' },
      {
        title: 'Custom port, reachable from other machines / containers',
        cmd: 'anvil --host 0.0.0.0 --port 8546',
      },
      {
        title: 'More accounts with a custom balance (ETH)',
        cmd: 'anvil --accounts 20 --balance 1000000',
      },
      {
        title: 'Persist state across restarts',
        cmd: 'anvil --state ./anvil-state.json',
        note: 'Loads the file on start and writes it on exit.',
      },
    ],
  },
  {
    title: 'Manipulate an anvil chain',
    description: 'Run against a local anvil (export ETH_RPC_URL=http://127.0.0.1:8545).',
    commands: [
      {
        title: 'Send as any address (e.g. a token whale)',
        cmd: [
          'cast rpc anvil_impersonateAccount $WHALE',
          'cast send --from $WHALE --unlocked $TOKEN "transfer(address,uint256)" $TO 1000000',
          'cast rpc anvil_stopImpersonatingAccount $WHALE',
        ].join('\n'),
        note: 'Give the whale gas first with anvil_setBalance if it holds no ETH.',
      },
      { title: 'Set ETH balance', cmd: 'cast rpc anvil_setBalance $ADDR $(cast to-wei 100)' },
      { title: 'Set nonce', cmd: 'cast rpc anvil_setNonce $ADDR 0x5' },
      { title: 'Replace contract bytecode', cmd: 'cast rpc anvil_setCode $ADDR $BYTECODE' },
      {
        title: 'Write a storage slot',
        cmd: 'cast rpc anvil_setStorageAt $ADDR 0x0 0x0000000000000000000000000000000000000000000000000000000000000001',
      },
      {
        title: 'Fast-forward time 1 hour',
        cmd: 'cast rpc evm_increaseTime 3600 && cast rpc evm_mine',
      },
      { title: 'Mine 10 blocks', cmd: 'cast rpc anvil_mine 10' },
      {
        title: 'Snapshot and roll back',
        cmd: 'cast rpc evm_snapshot\n# ... do things ...\ncast rpc evm_revert 0x0',
        note: 'Pass the id evm_snapshot returned; each id can be reverted once.',
      },
      {
        title: 'Re-fork at a different block without restarting',
        cmd: `cast rpc anvil_reset '[{"forking":{"jsonRpcUrl":"https://ethereum-rpc.publicnode.com","blockNumber":20000000}}]' --raw`,
      },
      { title: 'Default funded account #0 key', cmd: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' },
    ],
  },
  {
    title: 'Send transactions',
    commands: [
      { title: 'Send ETH', cmd: 'cast send $TO --value 0.1ether --account dev' },
      {
        title: 'Call a state-changing function',
        cmd: 'cast send $TOKEN "approve(address,uint256)" $SPENDER 1000000 --account dev',
      },
      { title: 'Deploy raw bytecode', cmd: 'cast send --create $BYTECODE --account dev' },
      { title: 'Read the receipt', cmd: 'cast receipt $TX_HASH' },
      {
        title: 'Run a forge script for real',
        cmd: 'forge script script/Deploy.s.sol --rpc-url $ETH_RPC_URL --account dev --broadcast',
      },
    ],
  },
  {
    title: 'Encode and decode',
    commands: [
      { title: 'Function selector', cmd: 'cast sig "transfer(address,uint256)"' },
      { title: 'Event topic', cmd: 'cast sig-event "Transfer(address,address,uint256)"' },
      { title: 'Encode calldata', cmd: 'cast calldata "transfer(address,uint256)" $TO 1000000' },
      { title: 'Decode calldata with a known signature', cmd: 'cast decode-calldata "transfer(address,uint256)" $CALLDATA' },
      { title: 'Decode calldata by selector lookup', cmd: 'cast 4byte-calldata $CALLDATA' },
      { title: 'Decode a revert', cmd: 'cast decode-error $REVERT_DATA' },
      { title: 'Units', cmd: 'cast to-wei 1.5 && cast from-wei 1500000000000000000 && cast to-unit 1000000000 gwei' },
      { title: 'Keccak-256', cmd: 'cast keccak "MintPaused()"' },
      { title: 'Storage layout of a contract', cmd: 'forge inspect src/Token.sol:Token storageLayout' },
    ],
  },
  {
    title: 'Logs',
    commands: [
      {
        title: 'ERC-20 Transfer events in a block range',
        cmd: 'cast logs --from-block 20000000 --to-block 20000100 --address $TOKEN "Transfer(address indexed,address indexed,uint256)"',
      },
    ],
  },
  {
    title: 'Testing',
    commands: [
      { title: 'One test with full traces', cmd: 'forge test --match-test testTransfer -vvvv' },
      { title: 'Tests against a mainnet fork', cmd: 'forge test --fork-url $ETH_RPC_URL --fork-block-number 20000000' },
      { title: 'Gas report', cmd: 'forge test --gas-report' },
    ],
  },
]
