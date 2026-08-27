export const options = { scenarios: { mixed: { executor: 'constant-vus', vus: 200, duration: '10m' } }, thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<800'] } };
export default function () { /* k6 runner injects authenticated route corpus in staging; no production credentials are stored here. */ }
