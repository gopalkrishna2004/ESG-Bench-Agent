import { useState, useMemo, useCallback, useEffect } from 'react';
import RecommendationCards from './RecommendationCards';
import ESGSimulator from './ESGSimulator';
import { computeSimulatedScores, computeTrajectory } from '../../utils/simulation';

export default function RecommendationsPanel({
  recommendations,
  currentScores,
  percentiles,
  sectorStats,
}) {
  // Direct per-metric state: { [metric_key]: { enabled, currentPercentile, targetPercentile } }
  const [toggles, setToggles] = useState({});
  // Track which recommendation cards are visually "active"
  const [activeRecs, setActiveRecs] = useState({});

  // Initialize toggles from recommendations on first render
  useEffect(() => {
    const initial = {};
    recommendations?.forEach((rec) => {
      rec.affected_metrics?.forEach((am) => {
        if (!initial[am.metric_key]) {
          initial[am.metric_key] = {
            enabled: false,
            currentPercentile: am.current_percentile,
            targetPercentile: am.current_percentile, // start at current (no change)
            suggestedTarget: am.target_percentile,    // AI-suggested target
          };
        }
      });
    });
    setToggles(initial);
  }, [recommendations]);

  // When a recommendation card is clicked, toggle its metrics to the AI-suggested targets
  const handleToggleRec = useCallback((recId) => {
    setActiveRecs((prev) => {
      const nowActive = !prev[recId];
      // Update metric toggles for this recommendation's affected metrics
      const rec = recommendations?.find((r) => r.id === recId);
      if (rec) {
        setToggles((prevToggles) => {
          const updated = { ...prevToggles };
          rec.affected_metrics?.forEach((am) => {
            if (updated[am.metric_key]) {
              updated[am.metric_key] = {
                ...updated[am.metric_key],
                enabled: nowActive,
                targetPercentile: nowActive
                  ? updated[am.metric_key].suggestedTarget
                  : updated[am.metric_key].currentPercentile,
              };
            }
          });
          return updated;
        });
      }
      return { ...prev, [recId]: nowActive };
    });
  }, [recommendations]);

  // When user toggles a metric On/Off directly in the simulator
  const handleMetricToggle = useCallback((metricKey) => {
    setToggles((prev) => {
      const t = prev[metricKey];
      if (!t) return prev;
      const nowEnabled = !t.enabled;
      return {
        ...prev,
        [metricKey]: {
          ...t,
          enabled: nowEnabled,
          targetPercentile: nowEnabled ? t.suggestedTarget : t.currentPercentile,
        },
      };
    });
  }, []);

  // When user drags a slider to a custom value
  const handleSliderChange = useCallback((metricKey, value) => {
    setToggles((prev) => {
      const t = prev[metricKey];
      if (!t) return prev;
      return {
        ...prev,
        [metricKey]: {
          ...t,
          enabled: value > t.currentPercentile,
          targetPercentile: value,
        },
      };
    });
  }, []);

  // Baseline: simulated score with no toggles active
  const baselineScores = useMemo(
    () => computeSimulatedScores(percentiles || {}, {}),
    [percentiles]
  );

  // Projected: simulated score with active overrides
  const activeOverrides = useMemo(() => {
    const overrides = {};
    Object.entries(toggles).forEach(([metric, t]) => {
      if (t.enabled && t.targetPercentile > t.currentPercentile) {
        overrides[metric] = t.targetPercentile;
      }
    });
    return overrides;
  }, [toggles]);

  const projectedScores = useMemo(
    () => computeSimulatedScores(percentiles || {}, activeOverrides),
    [percentiles, activeOverrides]
  );

  const trajectory = useMemo(
    () => computeTrajectory(currentScores?.overall, baselineScores?.overall, projectedScores?.overall),
    [currentScores, baselineScores, projectedScores]
  );

  const projectedOverall = useMemo(() => {
    const delta = (projectedScores?.overall || 0) - (baselineScores?.overall || 0);
    return Math.min(100, (currentScores?.overall || 0) + delta);
  }, [currentScores, baselineScores, projectedScores]);

  return (
    <div className="space-y-4">
      <RecommendationCards
        recommendations={recommendations}
        activeRecs={activeRecs}
        onToggleRec={handleToggleRec}
      />
      <ESGSimulator
        currentScores={currentScores}
        percentiles={percentiles}
        toggles={toggles}
        onMetricToggle={handleMetricToggle}
        onSliderChange={handleSliderChange}
        trajectory={trajectory}
        projectedOverall={projectedOverall}
      />
    </div>
  );
}
