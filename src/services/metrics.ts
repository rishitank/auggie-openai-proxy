/**
 * Simple Prometheus-compatible metrics service
 * No external dependencies - uses basic counters
 */

/**
 * Escape a Prometheus label value per the exposition format specification.
 * Escapes backslash, double-quote, and newline characters.
 * @see https://prometheus.io/docs/instrumenting/exposition_formats/
 */
const escapePromLabel = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

/** Metrics data structure */
interface Metrics {
  requestsTotal: number;
  requestsByEndpoint: Record<string, number>;
  requestsByStatus: Record<number, number>;
  errorsTotal: number;
  startTime: number;
}

/** Global metrics state */
const metrics: Metrics = {
  requestsTotal: 0,
  requestsByEndpoint: {},
  requestsByStatus: {},
  errorsTotal: 0,
  startTime: Date.now(),
};

/**
 * Increment request counter for an endpoint
 */
export const recordRequest = (endpoint: string, statusCode: number): void => {
  metrics.requestsTotal++;
  metrics.requestsByEndpoint[endpoint] = (metrics.requestsByEndpoint[endpoint] ?? 0) + 1;
  metrics.requestsByStatus[statusCode] = (metrics.requestsByStatus[statusCode] ?? 0) + 1;

  if (statusCode >= 400) {
    metrics.errorsTotal++;
  }
};

/**
 * Get metrics in Prometheus text format
 */
export const getPrometheusMetrics = (): string => {
  const uptimeSeconds = Math.floor((Date.now() - metrics.startTime) / 1000);

  const lines: string[] = [
    '# HELP auggie_requests_total Total number of requests',
    '# TYPE auggie_requests_total counter',
    `auggie_requests_total ${String(metrics.requestsTotal)}`,
    '',
    '# HELP auggie_errors_total Total number of error responses (4xx/5xx)',
    '# TYPE auggie_errors_total counter',
    `auggie_errors_total ${String(metrics.errorsTotal)}`,
    '',
    '# HELP auggie_uptime_seconds Server uptime in seconds',
    '# TYPE auggie_uptime_seconds gauge',
    `auggie_uptime_seconds ${String(uptimeSeconds)}`,
    '',
    '# HELP auggie_requests_by_endpoint_total Requests by endpoint',
    '# TYPE auggie_requests_by_endpoint_total counter',
  ];

  for (const [endpoint, count] of Object.entries(metrics.requestsByEndpoint)) {
    // Escape endpoint label value to prevent breaking Prometheus exposition format
    lines.push(`auggie_requests_by_endpoint_total{endpoint="${escapePromLabel(endpoint)}"} ${String(count)}`);
  }

  lines.push('');
  lines.push('# HELP auggie_requests_by_status_total Requests by HTTP status code');
  lines.push('# TYPE auggie_requests_by_status_total counter');

  for (const [status, count] of Object.entries(metrics.requestsByStatus)) {
    // Status is already a string from Object.entries, escape for safety
    lines.push(`auggie_requests_by_status_total{status="${escapePromLabel(status)}"} ${String(count)}`);
  }

  return lines.join('\n') + '\n';
};

/**
 * Get metrics as JSON (for debugging)
 */
export const getMetricsJson = (): Metrics & { uptimeSeconds: number } => ({
  ...metrics,
  uptimeSeconds: Math.floor((Date.now() - metrics.startTime) / 1000),
});

