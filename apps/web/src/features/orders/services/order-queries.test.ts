import { describe, expect, it } from 'vitest';
import { fetchOrder } from './order-queries';

describe('order queries', () => {
  it('returns order health counts without conflating applications and journeys', async () => {
    const order = await fetchOrder('order-01');
    expect(order.metrics).toEqual({ target: 8, activeApplications: 5, passed: 2, supplied: 1 });
  });
});
