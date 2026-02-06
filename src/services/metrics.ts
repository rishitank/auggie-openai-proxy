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

/** Histogram bucket boundaries in milliseconds */
const LATENCY_BUCKETS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000];

/** Latency histogram data */
interface LatencyHistogram {
  buckets: Record<number, number>;
  sum: number;
  count: number;
}

/** Metrics data structure */
interface Metrics {
  requestsTotal: number;
  requestsByEndpoint: Record<string, number>;
  requestsByStatus: Record<number, number>;
  errorsTotal: number;
  startTime: number;
  activeConnections: number;
  latencyByEndpoint: Record<string, LatencyHistogram>;
}

/** Create empty latency histogram */
const createHistogram = (): LatencyHistogram => ({
  buckets: Object.fromEntries(LATENCY_BUCKETS.map((b) => [b, 0])),
  sum: 0,
  count: 0,
});

/** Global metrics state */
const metrics: Metrics = {
  requestsTotal: 0,
  requestsByEndpoint: {},
  requestsByStatus: {},
  errorsTotal: 0,
  startTime: Date.now(),
  activeConnections: 0,
  latencyByEndpoint: {},
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
 * Record request latency for an endpoint
 */
export const recordLatency = (endpoint: string, durationMs: number): void => {
  const histogram = (metrics.latencyByEndpoint[endpoint] ??= createHistogram());

  histogram.sum += durationMs;
  histogram.count++;

  // Increment all buckets where duration <= bucket boundary
  for (const bucket of LATENCY_BUCKETS) {
    if (durationMs <= bucket) {
      const currentCount = histogram.buckets[bucket] ?? 0;
      histogram.buckets[bucket] = currentCount + 1;
    }
  }
};

/**
 * Increment active connections counter
 */
export const incrementActiveConnections = (): void => {
  metrics.activeConnections++;
};

/**
 * Decrement active connections counter
 */
export const decrementActiveConnections = (): void => {
  metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);
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

  // Active connections gauge
  lines.push('');
  lines.push('# HELP auggie_active_connections Current number of active connections');
  lines.push('# TYPE auggie_active_connections gauge');
  lines.push(`auggie_active_connections ${String(metrics.activeConnections)}`);

  // Latency histograms
  lines.push('');
  lines.push('# HELP auggie_request_duration_ms Request duration in milliseconds');
  lines.push('# TYPE auggie_request_duration_ms histogram');

  for (const [endpoint, histogram] of Object.entries(metrics.latencyByEndpoint)) {
    const escapedEndpoint = escapePromLabel(endpoint);
    // Output bucket counts (cumulative)
    for (const bucket of LATENCY_BUCKETS) {
      lines.push(
        `auggie_request_duration_ms_bucket{endpoint="${escapedEndpoint}",le="${String(bucket)}"} ${String(histogram.buckets[bucket])}`
      );
    }
    // +Inf bucket (same as count)
    lines.push(
      `auggie_request_duration_ms_bucket{endpoint="${escapedEndpoint}",le="+Inf"} ${String(histogram.count)}`
    );
    // Sum and count
    lines.push(`auggie_request_duration_ms_sum{endpoint="${escapedEndpoint}"} ${String(histogram.sum)}`);
    lines.push(`auggie_request_duration_ms_count{endpoint="${escapedEndpoint}"} ${String(histogram.count)}`);
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

