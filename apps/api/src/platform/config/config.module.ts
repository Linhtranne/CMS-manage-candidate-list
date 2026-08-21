import { Global, type DynamicModule, Module } from '@nestjs/common';
import { loadConfig, type RuntimeConfig } from './config.schema.js';

export const RUNTIME_CONFIG = Symbol('RUNTIME_CONFIG');

@Global()
@Module({})
export class RuntimeConfigModule {
  static forRoot(env: NodeJS.ProcessEnv = process.env): DynamicModule {
    const config = loadConfig(env);
    return {
      module: RuntimeConfigModule,
      providers: [{ provide: RUNTIME_CONFIG, useValue: config }],
      exports: [RUNTIME_CONFIG],
    };
  }
}

export type { RuntimeConfig };
