export type MetricInput = { numerator: number; denominator: number; timeZone: string };

export function normalizeMetric(input: MetricInput) {
  const rate = input.denominator === 0 ? 0 : input.numerator / input.denominator;
  return { ...input, rate, label: `${input.numerator}/${input.denominator} — ${Math.round(rate * 100)}%` };
}

export function formatMetricValue(metric: { value: number; numerator?: number; denominator?: number; unit: string }) {
  if (metric.numerator !== undefined && metric.denominator !== undefined) return `${metric.numerator}/${metric.denominator} — ${Math.round(metric.value * 100)}%`;
  if (metric.unit === 'DAYS') return `${metric.value} ngày`;
  if (metric.unit === 'MINUTES') return `${metric.value} phút`;
  if (metric.unit === 'PERCENT') return `${Math.round(metric.value * 100)}%`;
  return String(metric.value);
}
