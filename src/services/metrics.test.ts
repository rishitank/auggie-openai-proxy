/**
 * Tests for services/metrics.ts
 *
 * Verifies Prometheus metrics collection
 */

import {
  recordRequest,
  recordLatency,
  incrementActiveConnections,
  decrementActiveConnections,
  getPrometheusMetrics,
  getMetricsJson,
} from './metrics';

describe('services/metrics', () => {
  describe('recordRequest', () => {
    it('should increment total request count', () => {
      const before = getMetricsJson().requestsTotal;
      recordRequest('GET /health', 200);
      const after = getMetricsJson().requestsTotal;
      expect(after).toBe(before + 1);
    });

    it('should track requests by endpoint', () => {
      const endpoint = 'POST /v1/chat/completions';
      const before = getMetricsJson().requestsByEndpoint[endpoint] ?? 0;
      recordRequest(endpoint, 200);
      const after = getMetricsJson().requestsByEndpoint[endpoint] ?? 0;
      expect(after).toBe(before + 1);
    });

    it('should track requests by status code', () => {
      const before = getMetricsJson().requestsByStatus[201] ?? 0;
      recordRequest('POST /test', 201);
      const after = getMetricsJson().requestsByStatus[201] ?? 0;
      expect(after).toBe(before + 1);
    });

    it('should increment error count for 4xx status', () => {
      const before = getMetricsJson().errorsTotal;
      recordRequest('GET /notfound', 404);
      const after = getMetricsJson().errorsTotal;
      expect(after).toBe(before + 1);
    });

    it('should increment error count for 5xx status', () => {
      const before = getMetricsJson().errorsTotal;
      recordRequest('GET /error', 500);
      const after = getMetricsJson().errorsTotal;
      expect(after).toBe(before + 1);
    });

    it('should not increment error count for 2xx status', () => {
      const before = getMetricsJson().errorsTotal;
      recordRequest('GET /ok', 200);
      const after = getMetricsJson().errorsTotal;
      expect(after).toBe(before);
    });
  });

  describe('getPrometheusMetrics', () => {
    it('should return Prometheus text format', () => {
      const output = getPrometheusMetrics();
      expect(output).toContain('# HELP auggie_requests_total');
      expect(output).toContain('# TYPE auggie_requests_total counter');
      expect(output).toContain('auggie_requests_total');
    });

    it('should include errors metric', () => {
      const output = getPrometheusMetrics();
      expect(output).toContain('# HELP auggie_errors_total');
      expect(output).toContain('auggie_errors_total');
    });

    it('should include uptime metric', () => {
      const output = getPrometheusMetrics();
      expect(output).toContain('# HELP auggie_uptime_seconds');
      expect(output).toContain('auggie_uptime_seconds');
    });

    it('should include endpoint breakdown', () => {
      recordRequest('GET /metrics-test', 200);
      const output = getPrometheusMetrics();
      expect(output).toContain('auggie_requests_by_endpoint_total{endpoint="GET /metrics-test"}');
    });

    it('should include status code breakdown', () => {
      recordRequest('GET /status-test', 418);
      const output = getPrometheusMetrics();
      expect(output).toContain('auggie_requests_by_status_total{status="418"}');
    });
  });

  describe('getMetricsJson', () => {
    it('should return metrics as JSON object', () => {
      const json = getMetricsJson();
      expect(json).toHaveProperty('requestsTotal');
      expect(json).toHaveProperty('requestsByEndpoint');
      expect(json).toHaveProperty('requestsByStatus');
      expect(json).toHaveProperty('errorsTotal');
      expect(json).toHaveProperty('uptimeSeconds');
    });

    it('should have non-negative uptime', () => {
      const json = getMetricsJson();
      expect(json.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe('recordLatency', () => {
    it('should record latency for an endpoint', () => {
      const endpoint = 'GET /latency-test';
      recordLatency(endpoint, 150);
      const json = getMetricsJson();
      const histogram = json.latencyByEndpoint[endpoint];
      expect(histogram).toBeDefined();
      expect(histogram?.count).toBeGreaterThanOrEqual(1);
    });

    it('should increment histogram bucket counts', () => {
      const endpoint = 'GET /bucket-test';
      recordLatency(endpoint, 75); // Should fall in 100ms bucket and above
      const json = getMetricsJson();
      const histogram = json.latencyByEndpoint[endpoint];
      expect(histogram).toBeDefined();
      expect(histogram?.buckets[100]).toBeGreaterThanOrEqual(1);
      expect(histogram?.buckets[250]).toBeGreaterThanOrEqual(1);
    });

    it('should accumulate sum and count', () => {
      const endpoint = 'GET /accumulate-test';
      recordLatency(endpoint, 100);
      recordLatency(endpoint, 200);
      const json = getMetricsJson();
      const histogram = json.latencyByEndpoint[endpoint];
      expect(histogram).toBeDefined();
      expect(histogram?.count).toBeGreaterThanOrEqual(2);
      expect(histogram?.sum).toBeGreaterThanOrEqual(300);
    });

    it('should include latency histogram in Prometheus output', () => {
      recordLatency('GET /prom-latency', 50);
      const output = getPrometheusMetrics();
      expect(output).toContain('auggie_request_duration_ms');
      expect(output).toContain('auggie_request_duration_ms_bucket');
    });
  });

  describe('activeConnections', () => {
    it('should increment active connections', () => {
      const before = getMetricsJson().activeConnections;
      incrementActiveConnections();
      const after = getMetricsJson().activeConnections;
      expect(after).toBe(before + 1);
    });

    it('should decrement active connections', () => {
      incrementActiveConnections();
      const before = getMetricsJson().activeConnections;
      decrementActiveConnections();
      const after = getMetricsJson().activeConnections;
      expect(after).toBe(before - 1);
    });

    it('should not go below zero', () => {
      // Ensure we start at 0
      while (getMetricsJson().activeConnections > 0) {
        decrementActiveConnections();
      }
      decrementActiveConnections();
      expect(getMetricsJson().activeConnections).toBe(0);
    });

    it('should include active connections in Prometheus output', () => {
      const output = getPrometheusMetrics();
      expect(output).toContain('auggie_active_connections');
    });
  });
});

