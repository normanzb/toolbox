/** A simplified input field exposed by a preset. */
export type PresetField = {
  /** Field label shown to the user. */
  label: string
  /** Optional input placeholder. */
  placeholder?: string
}

/** A pre-configured contract call: fixed ABI + function, with a simplified arg form. */
export type Preset = {
  /** Stable id used in the URL and dropdown. */
  id: string
  /** Human-readable dropdown label. */
  label: string
  /** Whether the call reads (eth_call) or writes (signed tx). */
  kind: 'read' | 'write'
  /** ABI for the call — human-readable signature(s) or JSON. */
  abi: string
  /** Function to invoke. */
  functionName: string
  /** Simplified fields the user fills, in order. */
  fields: PresetField[]
  /** Builds the real ABI argument list from the field values. */
  buildArgs: (values: string[]) => unknown[]
}

const SET_APPROVED_SWAPPERS_ABI =
  'function setApprovedSwappers(address[] _approvedSwappers, bool _setApproved)'
const HAS_ROLE_ABI = 'function hasRole(string _role, address _address) view returns (bool)'

/** Built-in presets. `Custom` (no preset) is represented by the empty id. */
export const PRESETS: Preset[] = [
  {
    id: 'grant-approved-swapper',
    label: 'Grant APPROVED_SWAPPER',
    kind: 'write',
    abi: SET_APPROVED_SWAPPERS_ABI,
    functionName: 'setApprovedSwappers',
    fields: [{ label: 'Wallet to approve', placeholder: '0x…' }],
    buildArgs: ([wallet]) => [[(wallet ?? '').trim()], true],
  },
  {
    id: 'revoke-approved-swapper',
    label: 'Revoke APPROVED_SWAPPER',
    kind: 'write',
    abi: SET_APPROVED_SWAPPERS_ABI,
    functionName: 'setApprovedSwappers',
    fields: [{ label: 'Wallet to revoke', placeholder: '0x…' }],
    buildArgs: ([wallet]) => [[(wallet ?? '').trim()], false],
  },
  {
    id: 'check-approved-swapper',
    label: 'Check approval status',
    kind: 'read',
    abi: HAS_ROLE_ABI,
    functionName: 'hasRole',
    fields: [{ label: 'Wallet to check', placeholder: '0x…' }],
    buildArgs: ([wallet]) => ['APPROVED_SWAPPER', (wallet ?? '').trim()],
  },
]

/** Returns the preset for an id, or undefined for `Custom`. */
export function findPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id)
}
