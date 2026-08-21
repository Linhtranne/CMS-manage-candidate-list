const url = process.argv[2] ?? 'http://127.0.0.1:3000/api/v1/health/live';
const deadline = Date.now() + 30_000;
let lastError = 'no response';

while (Date.now() < deadline) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
    if (response.ok) {
      console.log(JSON.stringify({ status: 'container_health_ok', url, httpStatus: response.status }));
      process.exit(0);
    }
    lastError = `HTTP ${response.status}`;
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

console.error(`CONTAINER_SMOKE_FAILED: ${lastError}`);
process.exit(1);
