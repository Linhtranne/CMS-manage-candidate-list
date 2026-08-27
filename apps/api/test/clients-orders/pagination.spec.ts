import { describe, expect, it } from 'vitest';
import { boundedLimit, decodeCursor, encodeCursor } from '../../src/modules/clients-orders/domain/pagination.js';

describe('client/order cursor contract', () => {
  it('round-trips a stable sort cursor and bounds page size', () => {
    const cursor = encodeCursor({ sortValue: '2026-08-21T00:00:00.000Z', id: 'order-1' });
    expect(decodeCursor(cursor)).toEqual({ sortValue: '2026-08-21T00:00:00.000Z', id: 'order-1' });
    expect(boundedLimit()).toBe(25);
    expect(boundedLimit(100)).toBe(100);
    expect(() => boundedLimit(101)).toThrow('INVALID_LIMIT');
  });

  it('fails closed on tampered cursor input', () => {
    expect(() => decodeCursor('not-a-cursor')).toThrow('INVALID_CURSOR');
  });
});
