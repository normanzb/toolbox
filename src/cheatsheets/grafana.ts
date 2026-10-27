import type { Cheatsheet } from './types'

/** Grafana panel queries against VictoriaMetrics (MetricsQL) and VictoriaLogs (LogsQL). */
export const GRAFANA: Cheatsheet = {
  id: 'grafana',
  title: 'Grafana queries',
  description:
    'Panel queries for VictoriaMetrics (MetricsQL, PromQL-compatible) and VictoriaLogs (LogsQL). MetricsQL examples were checked with vmalert-tool.',
  groups: [
    {
      title: 'Grafana variables',
      commands: [
        {
          title: 'Window for rate() / increase() in timeseries panels',
          cmd: 'sum(rate(http_requests_total{cluster="${cluster_name}"}[$__rate_interval]))',
          note: 'At least one scrape interval and scales with zoom. Don\'t also set a per-query interval like 1h: sparse counters then show "No data".',
        },
        {
          title: 'Whole dashboard time range (stat panels)',
          cmd: 'sum(increase(http_requests_total[$__range]))',
        },
        {
          title: 'Multi-value variable',
          cmd: 'up{service=~"${service}"}',
          note: 'Use =~ so Grafana can expand several selected values into a regex.',
        },
        {
          title: 'Variable query: label values',
          cmd: 'label_values(up{cluster="${cluster_name}"}, service)',
        },
        {
          title: 'Prefer ${var} over $var',
          cmd: '${cluster_name}',
          note: 'Both work; mixing them in one dashboard makes it harder to search and edit.',
        },
      ],
    },
    {
      title: 'Counters and rates',
      commands: [
        { title: 'Per-second rate by label', cmd: 'sum by (status) (rate(http_requests_total[5m]))' },
        {
          title: 'Count over the range, 0 instead of "No data"',
          cmd: 'sum(increase(jobs_failed_total[$__range])) or vector(0)',
          note: 'Without or vector(0), a counter that has never been emitted renders "No data".',
        },
        {
          title: 'Several metrics in one tile',
          cmd: 'sum(increase({__name__=~"burn_failed_total|freeze_failed_total"}[$__range])) or vector(0)',
        },
        {
          title: 'Adding terms that each need or vector(0)',
          cmd: `  (sum(increase(a_total[$__range])) or vector(0))
+ (sum(increase(b_total[$__range])) or vector(0))`,
          note: '+ binds tighter than or. Without the parentheses, b is dropped whenever a has a value.',
        },
        {
          title: 'Ratio that reads 0 when idle',
          cmd: `sum(rate(http_requests_total{status=~"5.."}[5m]))
  / clamp_min(sum(rate(http_requests_total[5m])), 1)`,
          note: 'Plain division gives 0/0 = NaN, which Grafana shows as "No data".',
        },
      ],
    },
    {
      title: 'Latency, top N, health',
      commands: [
        {
          title: 'Latency percentile from a histogram',
          cmd: 'histogram_quantile(0.9, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))',
          note: 'Keep le in the sum by. Put the percentile in the panel title, e.g. "Latency (p90)".',
        },
        { title: 'Top 5 series', cmd: 'topk(5, sum by (route) (rate(http_requests_total[5m])))' },
        {
          title: 'Pods down',
          cmd: 'sum by (service) (up{cluster="${cluster_name}"}) == 0',
          note: 'Readiness from up{}, not from log lines.',
        },
        { title: 'Metric missing entirely', cmd: 'absent(heartbeat_total)', note: 'Returns 1 when no series exists.' },
        {
          title: 'Value stopped moving (stalled)',
          cmd: 'max_over_time(chain_height[1h]) - min_over_time(chain_height[1h]) == 0',
        },
        {
          title: 'Add a friendly label',
          cmd: 'label_replace(chain_height, "name", "Ethereum", "chain", "evm:1")',
          note: 'Long chains of these drift when new values appear; say in the panel description where the mapping comes from.',
        },
      ],
    },
    {
      title: 'VictoriaLogs (LogsQL)',
      description: 'Filter on structured fields, not on message text you have to keep in sync.',
      commands: [
        { title: 'Errors from one app', cmd: 'kubernetes_labels.app:stoa AND level:error' },
        { title: 'Last 15 minutes only', cmd: '_time:15m level:error' },
        { title: 'Exact phrase in the message', cmd: '"connection refused"' },
        { title: 'Regex on a field', cmd: 'kubernetes_pod_name:~"job-queue.*"' },
        { title: 'Exclude', cmd: 'level:error AND NOT kubernetes_labels.app:grafana' },
        {
          title: 'Count errors by app',
          cmd: 'level:error | stats by (kubernetes_labels.app) count() errors',
        },
        {
          title: 'Most frequent error messages',
          cmd: 'level:error | stats by (_msg) count() hits | sort by (hits desc) | limit 10',
        },
        { title: 'Errors per 5 minutes', cmd: 'level:error | stats by (_time:5m) count() errors' },
        { title: 'Keep only some fields', cmd: 'level:error | fields _time, kubernetes_labels.app, _msg' },
      ],
    },
    {
      title: 'Logs as a table panel',
      commands: [
        {
          title: 'Transformations, in order',
          cmd: `1. Panel type: Table (not Logs)
2. Extract fields: source = labels, format = auto
3. Filter fields by name: regex include, e.g. ^(Time|level|_msg|component)$
4. Organize fields: order and rename columns`,
          note: 'Whitelist columns; VictoriaLogs adds many kubernetes.* fields that vary by container.',
        },
      ],
    },
  ],
}
