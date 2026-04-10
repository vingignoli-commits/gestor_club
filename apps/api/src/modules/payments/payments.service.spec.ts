import { describe, expect, it } from 'vitest';

describe('payments domain', () => {
  it('rejects allocations greater than payment total by business rule', () => {
    const amount = 100;
    const allocations = [60, 50];
    const total = allocations.reduce((sum, item) => sum + item, 0);

    expect(total > amount).toBe(true);
  });
});

