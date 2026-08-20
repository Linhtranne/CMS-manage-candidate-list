export type MetricInput = { numerator: number; denominator: number; timeZone: string };

export function normalizeMetric(input: MetricInput) {
  const rate = input.denominator === 0 ? 0 : input.numerator / input.denominator;
  return { ...input, rate, label: `${input.numerator}/${input.denominator} — ${Math.round(rate * 100)}%` };
}

export function formatMetricValue(
  metric: { value: number; numerator?: number; denominator?: number; unit: string },
  options: { days: string; minutes: string; formatNumber: (value: number) => string; formatPercent: (value: number) => string }
) {
  if (metric.numerator !== undefined && metric.denominator !== undefined) return `${options.formatNumber(metric.numerator)}/${options.formatNumber(metric.denominator)} — ${options.formatPercent(metric.value)}`;
  if (metric.unit === 'DAYS') return `${options.formatNumber(metric.value)} ${options.days}`;
  if (metric.unit === 'MINUTES') return `${options.formatNumber(metric.value)} ${options.minutes}`;
  if (metric.unit === 'PERCENT') return options.formatPercent(metric.value);
  return options.formatNumber(metric.value);
}
