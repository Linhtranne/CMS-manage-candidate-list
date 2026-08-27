export type MetricInput = { numerator: number; denominator: number; timeZone: string };

export function metricRate(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return Math.min(1, Math.max(0, numerator / denominator));
}

export function normalizeMetric(input: MetricInput) {
  const rate = metricRate(input.numerator, input.denominator);
  return { ...input, rate, label: `${input.numerator}/${input.denominator} — ${Math.round(rate * 100)}%` };
}

export function formatMetricValue(
  metric: { value: number; numerator?: number; denominator?: number; unit: string },
  options: { days: string; minutes: string; formatNumber: (value: number) => string; formatPercent: (value: number) => string }
) {
  if (metric.numerator !== undefined && metric.denominator !== undefined) {
    const rate = metricRate(metric.numerator, metric.denominator);
    return `${options.formatNumber(metric.numerator)}/${options.formatNumber(metric.denominator)} — ${options.formatPercent(rate)}`;
  }
  if (metric.unit === 'DAYS') return `${options.formatNumber(metric.value)} ${options.days}`;
  if (metric.unit === 'MINUTES') return `${options.formatNumber(metric.value)} ${options.minutes}`;
  if (metric.unit === 'PERCENT') return options.formatPercent(metric.value);
  return options.formatNumber(metric.value);
}
