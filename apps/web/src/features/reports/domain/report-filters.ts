export type ReportFilterKey = 'from' | 'to' | 'teamId' | 'ownerId' | 'clientId' | 'orderId' | 'industryId' | 'sourceId';

export type ReportFilters = Partial<Record<ReportFilterKey, string>>;

export function normalizeReportFilters(searchParams: URLSearchParams | string | undefined): ReportFilters {
  const params = typeof searchParams === 'string' ? new URLSearchParams(searchParams) : searchParams;
  if (!params) return {};
  const keys: ReportFilterKey[] = ['from', 'to', 'teamId', 'ownerId', 'clientId', 'orderId', 'industryId', 'sourceId'];
  return Object.fromEntries(keys.flatMap((key) => {
    const value = params.get(key)?.trim();
    return value ? [[key, value]] : [];
  })) as ReportFilters;
}

export function reportFiltersToSearchParams(filters: ReportFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
  return params;
}
