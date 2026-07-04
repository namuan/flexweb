import { describe, expect, it } from 'vitest';
import { makeId } from '../../src/shared/storage';

describe('storage helpers', () => {
  it('creates prefixed unique ids', () => {
    const first = makeId('test');
    const second = makeId('test');
    expect(first).toMatch(/^test_/);
    expect(second).toMatch(/^test_/);
    expect(first).not.toBe(second);
  });
});
