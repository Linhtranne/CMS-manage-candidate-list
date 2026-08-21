const SENSITIVE_KEY = /password|passphrase|secret|token|authorization|cookie|passport|credential|privatekey|email|phone|address|body|filename/i;

export function redactStructuredValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redactStructuredValue(item));
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (SENSITIVE_KEY.test(key)) continue;
      output[key] = redactStructuredValue(item);
    }
    return output;
  }
  return value;
}

export function redactErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/postgres(?:ql)?:\/\/[^\s)]+/gi, 'postgresql://[redacted]')
    .replace(/(password|passphrase|secret|token|authorization|cookie)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]');
}
