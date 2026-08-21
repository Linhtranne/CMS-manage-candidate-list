import { Inject, Injectable, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { metrics, trace } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { RUNTIME_CONFIG, type RuntimeConfig } from '../config/config.module.js';

@Injectable()
export class TelemetryService implements OnModuleInit, OnModuleDestroy {
  private readonly counters = new Map<string, number>();
  private readonly tracer = trace.getTracer('cms-candidate-supply');
  private sdk?: NodeSDK;

  constructor(@Optional() @Inject(RUNTIME_CONFIG) private readonly config?: RuntimeConfig) {}

  onModuleInit(): void {
    if (this.config?.telemetry.enabled) {
      this.sdk = new NodeSDK();
      this.sdk.start();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.sdk) await this.sdk.shutdown();
  }

  increment(name: string, amount = 1): void {
    const next = (this.counters.get(name) ?? 0) + amount;
    this.counters.set(name, Math.max(0, next));
    metrics.getMeter('cms-candidate-supply').createCounter(name.replace(/[^a-zA-Z0-9_.-]/g, '_')).add(amount);
  }

  snapshot(): Record<string, number> { return Object.fromEntries(this.counters); }

  async withSpan<T>(name: string, work: () => Promise<T>): Promise<T> {
    return this.tracer.startActiveSpan(name, async (span) => {
      try { return await work(); } catch (error) { span.recordException(error as Error); throw error; } finally { span.end(); }
    });
  }
}
