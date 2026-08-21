# Uncertain send outcome

1. Treat provider timeout/reset after acceptance as `RECONCILING`, never as a safe retry.
2. Verify the stable provider client reference (`cms-email:<messageId>`) through the provider sandbox/API.
3. Mark `SENT` only when the provider lookup proves acceptance. Move to `RETRY_WAIT` only when the lookup explicitly proves no acceptance.
4. If lookup is unavailable, keep reconciling and page Operations. Do not send a second message manually.
