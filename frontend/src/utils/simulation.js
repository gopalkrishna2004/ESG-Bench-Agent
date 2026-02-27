import { METRICS_CONFIG } from './metricsConfig';

/**
 * Compute simulated pillar scores by merging current percentiles with toggled overrides.
 * Returns the overall score as average of pillar averages (from percentiles).
 */
export function computeSimulatedScores(currentPercentiles, toggledMetrics) {
  const merged = { ...currentPercentiles, ...toggledMetrics };

  const buckets = { environmental: [], social: [], governance: [] };
  Object.entries(METRICS_CONFIG).forEach(([metric, config]) => {
    const val = merged[metric];
    if (val == null) return;
    buckets[config.pillar].push(val);
  });

  const avg = (arr) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  const pillar = {
    environmental: avg(buckets.environmental),
    social: avg(buckets.social),
    governance: avg(buckets.governance),
  };

  const validPillars = [pillar.environmental, pillar.social, pillar.governance].filter(
    (v) => v != null
  );
  pillar.overall = validPillars.length
    ? Math.round(validPillars.reduce((a, b) => a + b, 0) / validPillars.length)
    : null;

  return pillar;
}

/**
 * Generate a 3-year trajectory using the real backend overall score as anchor.
 * The delta is computed from the difference between simulated baseline (no toggles)
 * and simulated projected (with toggles).
 */
export function computeTrajectory(backendOverall, baselineSimOverall, projectedSimOverall) {
  const currentYear = new Date().getFullYear();
  const anchor = backendOverall || 0;
  // Delta between projected and baseline simulation (both use same percentile method)
  const delta = (projectedSimOverall || 0) - (baselineSimOverall || 0);
  const target = anchor + delta;

  return [
    { year: currentYear, score: anchor },
    { year: currentYear + 1, score: Math.round(anchor + delta * 0.4) },
    { year: currentYear + 2, score: Math.min(100, target) },
  ];
}
