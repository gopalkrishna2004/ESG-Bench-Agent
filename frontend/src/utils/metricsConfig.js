/** Metric definitions mirroring backend METRICS_CONFIG */
export const METRICS_CONFIG = {
  scope_1: { label: 'Scope 1 Emissions', unit: 'tCO₂e', lowerIsBetter: true, pillar: 'environmental' },
  scope_2: { label: 'Scope 2 Emissions', unit: 'tCO₂e', lowerIsBetter: true, pillar: 'environmental' },
  emissions_intensity: { label: 'Emissions Intensity', unit: 'tCO₂e/unit', lowerIsBetter: true, pillar: 'environmental' },
  renewable_energy_pct: { label: 'Renewable Energy %', unit: '%', lowerIsBetter: false, pillar: 'environmental' },
  water_consumption: { label: 'Water Consumption', unit: 'KL', lowerIsBetter: true, pillar: 'environmental' },
  total_waste: { label: 'Total Waste', unit: 'MT', lowerIsBetter: true, pillar: 'environmental' },
  gender_diversity_pct: { label: 'Gender Diversity', unit: '%', lowerIsBetter: false, pillar: 'social' },
  board_women_percent: { label: 'Board Women %', unit: '%', lowerIsBetter: false, pillar: 'social' },
  ltifr: { label: 'LTIFR', unit: 'rate', lowerIsBetter: true, pillar: 'social' },
  employee_turnover_rate: { label: 'Employee Turnover', unit: '%', lowerIsBetter: true, pillar: 'social' },
  pay_equity_ratio: { label: 'Pay Equity Ratio', unit: 'ratio', lowerIsBetter: false, pillar: 'social' },
  independent_directors_percent: { label: 'Independent Directors', unit: '%', lowerIsBetter: false, pillar: 'governance' },
  data_breaches: { label: 'Data Breaches', unit: 'count', lowerIsBetter: true, pillar: 'governance' },
  net_zero_target_year: { label: 'Net Zero Target Year', unit: 'year', lowerIsBetter: true, pillar: 'governance' },
};
