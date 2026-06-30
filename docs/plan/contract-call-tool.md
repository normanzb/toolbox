# Plan: generic "Contract Caller" tool with grant/revoke presets

Date: 2026-06-30

## Goal

A new tool, `src/tools/ContractCallTool.tsx`, that calls any contract function:
paste a contract address + ABI, pick a function, fill typed argument fields, then
**read** (view/pure) or **write** (state-changing). Ships with presets — including
**Grant APPROVED_SWAPPER**, **Revoke APPROVED_SWAPPER**, and **Check approval status**
— that pre-fill the ABI/function and expose a simplified single "wallet address" field.
This replaces the `tsx` script in `monorepo/.norm/runbooks/sepolia-approved-swapper.md`.

## Context (existing architecture)

- Pure client-side React 19 + Vite + viem, no router, no wallet-connect infra.
- Tools are self-contained `<Section>` components stacked in `src/App.tsx`.
- `Settings` (`src/settings.tsx`) provides the active `chain` + per-chain `rpcUrl`.
- Reads use `createPublicClient({ transport: http(rpcUrl) })` (see `Eip1967Tool.tsx`).
- `SignTool.tsx` establishes the "paste a private key" pattern.
- `CalldataTool.tsx` has `parseAbiInput` (human-readable signatures *or* JSON ABI)
  and `bigintReplacer` — both will be lifted to a shared util.

## Signing approach (decided — support both)

Writes need a signer. Add a small mode toggle:

- **Injected wallet** (`window.ethereum` via `createWalletClient({ transport: custom(...) })`)
  — default, safer, matches the runbook's "use an admin wallet" path. Auto-prompts a
  chain switch if the wallet is on the wrong network.
- **Private key** (plain `useState`, **never** URL/localStorage-synced) — replicates the
  headless script exactly.

Reads never need a signer.

## New files

1. **`src/tools/ContractCallTool.tsx`** — the tool. Sections:
   - Preset dropdown (`Custom` + the 3 presets).
   - Contract address input.
   - ABI textarea (reuse `parseAbiInput`).
   - Function `<select>` listing functions parsed from the ABI, tagged read/write by
     `stateMutability`.
   - Per-argument inputs, one field per ABI input, labeled `name (type)`. A
     `coerceArg(type, text)` helper converts text → the JS type viem expects
     (`uint*`/`int*` → `bigint`, `bool` → boolean, arrays/tuples → `JSON.parse`,
     `address`/`string`/`bytes` → string). viem validates on encode.
   - Action button: `Read` for view/pure → `readContract`; `Write` for
     nonpayable/payable → `writeContract`, then `waitForTransactionReceipt`.
   - Output via existing `CopyField` (result / tx hash / decoded return) plus an `error`
     line. Reuse `bigintReplacer` for display.

2. **`src/tools/presets.ts`** — data-driven preset definitions:
   ```ts
   type Preset = {
     id: string; label: string; kind: 'read' | 'write'
     abi: string; functionName: string
     fields: { label: string; placeholder?: string }[]   // simplified UI fields
     buildArgs: (values: string[]) => unknown[]           // → real ABI args
   }
   ```
   - **Grant** → `setApprovedSwappers(address[],bool)`, one field (wallet),
     `buildArgs: ([w]) => [[w], true]`.
   - **Revoke** → same, `buildArgs: ([w]) => [[w], false]`.
   - **Check approval status** → `hasRole(string,address) view returns (bool)`, one field
     (wallet), `buildArgs: ([w]) => ['APPROVED_SWAPPER', w]`, `kind: 'read'`.
   - `Custom` (no preset) → falls back to the generic per-arg form.

## Edits to existing files

3. **`src/abi.ts`** (new shared util) — move `parseAbiInput` + `bigintReplacer` out of
   `CalldataTool.tsx` and import them in both places (avoids duplication).
4. **`src/App.tsx`** — import and render `<ContractCallTool />`.
5. **Write path / chains** — public reads work with just `http(rpcUrl)`. The private-key
   `writeContract` path needs a viem `Chain` object; build a minimal one on the fly with
   `defineChain({ id: chain.id, name: chain.name, nativeCurrency, rpcUrls })`. No change
   to the `CHAINS` shape needed.
6. **`README.md`** — add the tool to the Tools list, reiterating the "don't paste keys
   with real funds" warning.

## URL / state rules

- URL-synced (shareable, via `useUrlParam`): preset id, contract address, ABI, selected
  function, arg field values.
- **Never synced** (plain `useState`): private key, the injected-wallet connection.

## Verification

- `pnpm build` (tsc + vite) passes.
- `pnpm dev`: with Sepolia selected, **Check approval status** preset → `hasRole` read
  returns a bool; **Grant** preset with an authorized signer → tx confirms, status flips
  to `true` (mirrors the runbook's verify step).

## Out of scope

- No multi-wallet / WalletConnect — just injected + private key.
- Doesn't deploy contracts: per the runbook caveat, if no pair exists on the target
  network the write reverts — the tool surfaces the revert, nothing more.

## Risk note

This is a strictly more powerful version of the `SignTool` key-pasting risk — a generic
write tool usable with an admin key. The injected-wallet default mitigates it; the
private-key field is opt-in and never persisted.
