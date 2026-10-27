import type { Cheatsheet } from './types'

/** vmalert-tool unit test format: file layout, series notation and assertions. */
export const VMALERT: Cheatsheet = {
  id: 'vmalert',
  title: 'vmalert tests',
  description:
    'Unit tests for VictoriaMetrics alert and recording rules, run by vmalert-tool against synthetic series. Behavior below was checked against vmalert-tool.',
  groups: [
    {
      title: 'Run',
      commands: [
        { title: 'Run test files', cmd: 'vmalert-tool unittest --files=tests/*.test.yaml' },
        {
          title: 'Add a label to every generated alert',
          cmd: 'vmalert-tool unittest --files=tests/a.test.yaml --external.label=cluster=stage',
          note: 'Replaces the external_labels test field, which vmalert-tool warns is being deprecated.',
        },
        { title: 'Agora monorepo', cmd: 'pnpm run -C pulumi alert-rules:test' },
      ],
    },
    {
      title: 'File skeleton',
      commands: [
        {
          title: 'Alert test',
          cmd: `rule_files:
  - ../output/rules/api.yaml
evaluation_interval: 1m

tests:
  - name: "fires after 5m of errors"
    interval: 1m
    input_series:
      - series: 'http_errors_total{job="api"}'
        values: "0+10x20"
    alert_rule_test:
      - eval_time: 10m
        groupname: api
        alertname: ApiErrors
        exp_alerts:
          - exp_labels:
              alertname: ApiErrors
              severity: warning
              job: api
            exp_annotations:
              summary: "API error rate is high"`,
        },
        {
          title: 'Query test (no rule needed)',
          cmd: `    metricsql_expr_test:
      - expr: sum(increase(http_errors_total[5m]))
        eval_time: 10m
        exp_samples:
          - labels: '{}'
            value: 50`,
          note: 'Checks any MetricsQL expression. Handy for proving a dashboard or alert query returns what you think.',
        },
      ],
    },
    {
      title: 'input_series values notation',
      description:
        'One sample per interval step, starting at 0s. interval defaults to evaluation_interval.',
      commands: [
        {
          title: 'Counter: start a, add b, N more steps',
          cmd: '"0+1x3"',
          note: '0 1 2 3. axN-style terms produce N+1 samples.',
        },
        { title: 'Decreasing', cmd: '"10-2x3"', note: '10 8 6 4' },
        { title: 'Constant', cmd: '"5x3"', note: '5 5 5 5 (N+1 samples).' },
        { title: 'Explicit values', cmd: '"0 1 1 5"', note: 'One sample per step.' },
        {
          title: 'Missing sample',
          cmd: '"1 _ 3"',
          note: 'No sample at the 1m step; queries there fall back to the 1 at 0s via lookback.',
        },
        {
          title: 'Run of missing samples',
          cmd: '"_x2 7"',
          note: '2 empty steps, then 7 at the 2m step. Unlike axN, _xN is exactly N steps.',
        },
        {
          title: 'Series disappears',
          cmd: '"1 1 stale"',
          note: 'Staleness marker: from the 2m step the series returns no data, as if the target vanished.',
        },
        {
          title: 'Mix terms',
          cmd: '"0+1x10 10x5 stale"',
          note: 'Ramps 0 to 10, holds at 10, then disappears.',
        },
      ],
    },
    {
      title: 'Assertions',
      commands: [
        {
          title: 'Alert must NOT fire',
          cmd: `        exp_alerts: []`,
        },
        {
          title: 'Timing with for:',
          cmd: `# rule: expr: m > 5, for: 2m
# series: "0 10 10 10 10"  (true from 1m)
- eval_time: 2m   # exp_alerts: []  (still pending)
- eval_time: 3m   # fires: 1m + for 2m`,
          note: 'Fires at the first step where the condition has held for the whole for: duration.',
        },
        {
          title: 'exp_labels is an exact match',
          cmd: `exp_labels:
  alertname: High      # always required
  severity: warning    # labels from the rule
  job: j               # labels left on the series by expr
  cluster: stage       # --external.label values`,
          note: 'A missing or extra label fails the test. The rule group label (alertgroup) is added for you.',
        },
        {
          title: 'Annotations are templated before comparing',
          cmd: `exp_annotations:
  summary: "m is 10"   # rule: summary: "m is {{ $value }}"`,
        },
      ],
    },
  ],
}
