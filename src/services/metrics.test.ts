/**
 * Tests for services/metrics.ts
 *
 * Verifies Prometheus metrics collection
 */

import { recordRequest, getPrometheusMetrics, getMetricsJson } from './metrics';

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
});

