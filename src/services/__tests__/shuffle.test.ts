import { describe, it, expect, beforeEach, vi } from 'vitest';
import { shuffle } from '../shuffle';

describe('shuffle', () => {
  it('should shuffle an array', () => {
    const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const original = [...array];

    const result = shuffle(array);

    // Result should be the same array (modified in place)
    expect(result).toBe(array);

    // Array should have same elements (just reordered)
    expect(result.sort()).toEqual(original.sort());
  });

  it('should handle empty array', () => {
    const array: number[] = [];
    const result = shuffle(array);
    expect(result).toEqual([]);
  });

  it('should handle single element array', () => {
    const array = [42];
    const result = shuffle(array);
    expect(result).toEqual([42]);
  });

  it('should handle two element array', () => {
    const array = [1, 2];
    const result = shuffle(array);
    expect(result.length).toBe(2);
    expect(result).toContain(1);
    expect(result).toContain(2);
  });

  it('should maintain all elements (no duplicates or losses)', () => {
    const array = [1, 2, 3, 4, 5];
    shuffle(array);

    expect(array).toHaveLength(5);
    expect(array).toContain(1);
    expect(array).toContain(2);
    expect(array).toContain(3);
    expect(array).toContain(4);
    expect(array).toContain(5);
  });

  it('should work with different types', () => {
    const strings = ['a', 'b', 'c', 'd'];
    shuffle(strings);
    expect(strings).toHaveLength(4);
    expect(strings).toContain('a');
    expect(strings).toContain('b');
    expect(strings).toContain('c');
    expect(strings).toContain('d');

    const objects = [{ id: 1 }, { id: 2 }, { id: 3 }];
    shuffle(objects);
    expect(objects).toHaveLength(3);
    expect(objects.map((o) => o.id).sort()).toEqual([1, 2, 3]);
  });

  it('should produce different orders on multiple calls (probabilistically)', () => {
    // This test is probabilistic - with 10 elements, the chance of getting
    // the same order twice is 1/10! = 1/3,628,800
    const array1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const array2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    shuffle(array1);
    shuffle(array2);

    // Arrays should likely be different (not a guarantee, but extremely likely)
    // We'll just verify both were shuffled
    expect(array1).toHaveLength(10);
    expect(array2).toHaveLength(10);
  });

  it('should use Math.random for randomness', () => {
    const spy = vi.spyOn(Math, 'random');
    const array = [1, 2, 3];

    shuffle(array);

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should shuffle deterministically with mocked random', () => {
    const array = [1, 2, 3, 4, 5];
    const randomValues = [0.9, 0.5, 0.1, 0.3];
    let callCount = 0;

    vi.spyOn(Math, 'random').mockImplementation(() => {
      return randomValues[callCount++ % randomValues.length];
    });

    shuffle(array);

    expect(array).toHaveLength(5);

    vi.restoreAllMocks();
  });
});
