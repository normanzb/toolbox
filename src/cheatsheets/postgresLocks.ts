import type { Cheatsheet } from './types'

const TABLE_MODES = ['AS', 'RS', 'RE', 'SUE', 'S', 'SRE', 'E', 'AE']

/** Held mode (row) vs requested mode (column); X = must wait. Measured on Postgres 16. */
const TABLE_CONFLICTS = [
  '.......X',
  '......XX',
  '....XXXX',
  '...XXXXX',
  '..XX.XXX',
  '..XXXXXX',
  '.XXXXXXX',
  'XXXXXXXX',
]

const ROW_MODES = ['KEY SHARE', 'SHARE', 'NO KEY UPDATE', 'UPDATE']

const ROW_CONFLICTS = ['...X', '..XX', '.XXX', 'XXXX']

const toRows = (modes: string[], conflicts: string[]) =>
  conflicts.map((line, i) => [modes[i], ...[...line].map((c) => (c === 'X' ? '✕' : ''))])

/** PostgreSQL lock modes, weakest to strongest, with what each blocks. */
export const POSTGRES_LOCKS: Cheatsheet = {
  id: 'postgres-locks',
  title: 'Postgres locks',
  description:
    'Lock modes from weakest to strongest, what takes them, and what they block. Locks are held until the transaction ends. Conflict tables were measured on Postgres 16.',
  groups: [
    {
      title: 'Table-level conflict matrix',
      description:
        'Row = lock already held, column = lock requested; ✕ = the request waits. AS ACCESS SHARE, RS ROW SHARE, RE ROW EXCLUSIVE, SUE SHARE UPDATE EXCLUSIVE, S SHARE, SRE SHARE ROW EXCLUSIVE, E EXCLUSIVE, AE ACCESS EXCLUSIVE.',
      commands: [],
      table: { columns: ['Held ↓ / requested →', ...TABLE_MODES], rows: toRows(TABLE_MODES, TABLE_CONFLICTS) },
      wide: true,
    },
    {
      title: 'Table-level modes (weakest → strongest)',
      commands: [
        {
          title: '1. ACCESS SHARE',
          cmd: 'SELECT * FROM t;',
          note: 'Any plain read. Blocked only by ACCESS EXCLUSIVE.',
        },
        {
          title: '2. ROW SHARE',
          cmd: 'SELECT * FROM t WHERE id = 1 FOR UPDATE;  -- or FOR NO KEY UPDATE / SHARE / KEY SHARE',
          note: 'Reading rows with intent to lock them. Conflicts with EXCLUSIVE, ACCESS EXCLUSIVE.',
        },
        {
          title: '3. ROW EXCLUSIVE',
          cmd: 'INSERT / UPDATE / DELETE / MERGE',
          note: 'Any data change. Writers don\'t block each other here; row locks handle that. Conflicts with SHARE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE.',
        },
        {
          title: '4. SHARE UPDATE EXCLUSIVE',
          cmd: `VACUUM t;  ANALYZE t;
CREATE INDEX CONCURRENTLY i ON t (c);
REINDEX INDEX CONCURRENTLY i;
ALTER TABLE t VALIDATE CONSTRAINT c;`,
          note: 'Maintenance that keeps reads and writes running but can\'t run twice at once. Conflicts with itself, SHARE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE.',
        },
        {
          title: '5. SHARE',
          cmd: 'CREATE INDEX i ON t (c);  -- without CONCURRENTLY',
          note: 'Freezes the data: reads continue, writes wait. Not self-conflicting, so two CREATE INDEX can run together. Conflicts with ROW EXCLUSIVE, SHARE UPDATE EXCLUSIVE, SHARE ROW EXCLUSIVE, EXCLUSIVE, ACCESS EXCLUSIVE.',
        },
        {
          title: '6. SHARE ROW EXCLUSIVE',
          cmd: `CREATE TRIGGER …;
ALTER TABLE child ADD FOREIGN KEY (p) REFERENCES parent;  -- on both tables`,
          note: 'Like SHARE but only one holder at a time. Conflicts with everything except ACCESS SHARE and ROW SHARE.',
        },
        {
          title: '7. EXCLUSIVE',
          cmd: 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv;',
          note: 'Only plain SELECTs get through. Conflicts with everything except ACCESS SHARE.',
        },
        {
          title: '8. ACCESS EXCLUSIVE',
          cmd: `DROP TABLE t;  TRUNCATE t;  VACUUM FULL t;  CLUSTER t;
REFRESH MATERIALIZED VIEW mv;
ALTER TABLE t ADD COLUMN …;  -- most ALTER TABLE forms
LOCK TABLE t;                -- default mode`,
          note: 'Blocks everything, including SELECT. Conflicts with every mode.',
        },
      ],
    },
    {
      title: 'Row-level conflict matrix',
      description: 'Row = lock already held on the row, column = lock requested; ✕ = the request waits.',
      commands: [],
      table: { columns: ['Held ↓ / requested →', ...ROW_MODES], rows: toRows(ROW_MODES, ROW_CONFLICTS) },
    },
    {
      title: 'Row-level modes (weakest → strongest)',
      description: 'Taken on individual rows; never block plain SELECTs.',
      commands: [
        {
          title: '1. FOR KEY SHARE',
          cmd: 'SELECT … FOR KEY SHARE;',
          note: 'Taken on the parent row by foreign key checks. Stops key changes and deletes, nothing else. Conflicts with FOR UPDATE.',
        },
        {
          title: '2. FOR SHARE',
          cmd: 'SELECT … FOR SHARE;',
          note: 'Row must not change at all. Conflicts with FOR NO KEY UPDATE, FOR UPDATE.',
        },
        {
          title: '3. FOR NO KEY UPDATE',
          cmd: 'UPDATE t SET v = v + 1 WHERE id = 1;  -- or SELECT … FOR NO KEY UPDATE',
          note: 'Taken by UPDATEs that leave key columns unchanged (setting a key to its current value counts). Doesn\'t block FK checks. Conflicts with FOR SHARE, FOR NO KEY UPDATE, FOR UPDATE.',
        },
        {
          title: '4. FOR UPDATE',
          cmd: `DELETE FROM t WHERE id = 1;
UPDATE t SET id = 2 WHERE id = 1;  -- changes a key value
SELECT … FOR UPDATE;`,
          note: 'Conflicts with every row lock mode.',
        },
      ],
    },
    {
      title: 'Gotchas',
      commands: [
        {
          title: 'A waiting lock blocks everyone behind it',
          cmd: `SET lock_timeout = '3s';
ALTER TABLE t ADD COLUMN c int;`,
          note: 'An ALTER waiting for ACCESS EXCLUSIVE queues every later SELECT on t behind it. Set lock_timeout in migrations so they give up instead of stalling the app.',
        },
        {
          title: 'Fail fast instead of waiting',
          cmd: 'SELECT * FROM t WHERE id = 1 FOR UPDATE NOWAIT;',
        },
        {
          title: 'Job queue: grab unlocked rows only',
          cmd: `SELECT * FROM jobs WHERE status = 'pending'
ORDER BY id LIMIT 10
FOR UPDATE SKIP LOCKED;`,
        },
        {
          title: 'App-defined lock (advisory)',
          cmd: `SELECT pg_advisory_xact_lock(42);      -- waits; released at commit
SELECT pg_try_advisory_xact_lock(42);  -- returns false instead of waiting`,
        },
      ],
    },
    {
      title: 'Inspect',
      commands: [
        {
          title: 'Who is blocked, and by whom',
          cmd: `SELECT pid, pg_blocking_pids(pid) AS blocked_by, wait_event_type,
       now() - query_start AS waiting, left(query, 80) AS query
FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0;`,
        },
        {
          title: 'Locks on one table',
          cmd: `SELECT l.pid, l.mode, l.granted, left(a.query, 80) AS query
FROM pg_locks l JOIN pg_stat_activity a USING (pid)
WHERE l.relation = 't'::regclass;`,
        },
        {
          title: 'Stop a blocker',
          cmd: `SELECT pg_cancel_backend(1234);     -- cancels its current query
SELECT pg_terminate_backend(1234);  -- kills the connection`,
        },
      ],
    },
  ],
}
