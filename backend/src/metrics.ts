/**
 * Latency monitoring and metrics collection for Card Clash 21 Backend
 * 
 * This module provides tools to track and analyze performance bottlenecks
 * across Redis, WebSocket, and game logic execution.
 */

interface LatencyMetric {
  endpoint: string;
  method: string;
  duration: number;
  timestamp: number;
  status?: number;
}

interface LatencyStats {
  endpoint: string;
  count: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

// Global metrics store (keep last 1000 metrics for analysis)
const metrics: LatencyMetric[] = [];
const MAX_METRICS = 1000;

/**
 * Record a latency metric (HTTP endpoint)
 */
export function recordMetric(endpoint: string, method: string, duration: number, status?: number): void {
  metrics.push({
    endpoint,
    method,
    duration,
    timestamp: Date.now(),
    status,
  });

  // Keep only the most recent metrics to avoid memory bloat
  if (metrics.length > MAX_METRICS) {
    metrics.shift();
  }
}

/**
 * Get aggregated latency statistics for an endpoint
 */
export function getEndpointStats(endpoint: string): LatencyStats | null {
  const endpointMetrics = metrics.filter((m) => m.endpoint === endpoint);
  if (endpointMetrics.length === 0) return null;

  const durations = endpointMetrics.map((m) => m.duration).sort((a, b) => a - b);
  const count = durations.length;
  const sum = durations.reduce((a, b) => a + b, 0);

  return {
    endpoint,
    count,
    avg: sum / count,
    p50: durations[Math.floor(count * 0.5)],
    p95: durations[Math.floor(count * 0.95)],
    p99: durations[Math.floor(count * 0.99)],
    max: durations[count - 1],
  };
}

/**
 * Get stats for all endpoints
 */
export function getAllStats(): LatencyStats[] {
  const endpoints = new Set(metrics.map((m) => m.endpoint));
  return Array.from(endpoints)
    .map((ep) => getEndpointStats(ep))
    .filter((s) => s !== null) as LatencyStats[];
}

/**
 * Get recent slow requests (> threshold ms)
 */
export function getSlowRequests(thresholdMs: number = 100, limit: number = 10): LatencyMetric[] {
  return metrics
    .filter((m) => m.duration > thresholdMs)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, limit);
}

/**
 * Express middleware to capture HTTP latency
 */
export function expressLatencyMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      recordMetric(req.path, req.method, duration, res.statusCode);

      if (duration > 100) {
        console.warn(`[SLOW HTTP] ${req.method} ${req.path}: ${duration}ms (status: ${res.statusCode})`);
      }
    });
    next();
  };
}

/**
 * Redis operation latency wrapper
 */
export function wrapRedisLatency<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().then(
    (result) => {
      const duration = Date.now() - start;
      recordMetric(`redis:${operation}`, "GET", duration, 200);
      if (duration > 50) {
        console.warn(`[SLOW REDIS] ${operation}: ${duration}ms`);
      }
      return result;
    },
    (error) => {
      const duration = Date.now() - start;
      recordMetric(`redis:${operation}`, "GET", duration, 500);
      console.error(`[REDIS ERROR] ${operation}: ${duration}ms`, error);
      throw error;
    }
  );
}

/**
 * Game logic operation latency tracking
 */
export function trackGameLatency<T>(operationName: string, fn: () => T): T {
  const start = Date.now();
  try {
    const result = fn();
    const duration = Date.now() - start;
    recordMetric(`game:${operationName}`, "LOGIC", duration, 200);
    if (duration > 50) {
      console.warn(`[SLOW GAME LOGIC] ${operationName}: ${duration}ms`);
    }
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    recordMetric(`game:${operationName}`, "LOGIC", duration, 500);
    console.error(`[GAME LOGIC ERROR] ${operationName}: ${duration}ms`, error);
    throw error;
  }
}

/**
 * Format metrics for display
 */
export function formatMetrics(): string {
  const stats = getAllStats();
  if (stats.length === 0) return "No metrics collected yet.";

  let output = "=== Latency Statistics ===\n";
  output += "Endpoint | Count | Avg | P95 | P99 | Max\n";
  output += "---------|-------|-----|-----|-----|-----\n";

  for (const stat of stats.sort((a, b) => b.avg - a.avg)) {
    output += `${stat.endpoint} | ${stat.count} | ${stat.avg.toFixed(2)}ms | ${stat.p95.toFixed(2)}ms | ${stat.p99.toFixed(2)}ms | ${stat.max.toFixed(2)}ms\n`;
  }

  return output;
}
