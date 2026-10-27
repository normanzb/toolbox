import { FOUNDRY } from './foundry'
import { GRAFANA } from './grafana'
import { POSTGRES_LOCKS } from './postgresLocks'
import type { Cheatsheet } from './types'
import { VMALERT } from './vmalert'

/** All cheatsheets, in tab order. */
export const CHEATSHEETS: Cheatsheet[] = [FOUNDRY, VMALERT, GRAFANA, POSTGRES_LOCKS]
