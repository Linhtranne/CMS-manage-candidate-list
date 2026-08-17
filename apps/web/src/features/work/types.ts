import type { components } from '@cms/contracts';

export type WorkItem = components['schemas']['WorkItem'];
export type WorkSummary = components['schemas']['WorkSummary'];
export type WorkListParams = {
  view?: string;
  sort?: string;
  query?: string;
  cursor?: string;
};

