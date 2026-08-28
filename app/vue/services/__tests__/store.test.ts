/**
 * Tests for Store Service
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { store } from '../store';

// Mock localStorage for Node.js environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    }
  };
})();

global.localStorage = localStorageMock as any;

describe('StoreService', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('get', () => {
    it('should retrieve stored data', async () => {
      const testData = { name: 'Test', value: 42 };
      localStorage.setItem('test-key', JSON.stringify(testData));

      const result = await store.get('test-key');
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent keys', async () => {
      const result = await store.get('non-existent');
      expect(result).toBeNull();
    });

    it('should throw error for invalid JSON', async () => {
      localStorage.setItem('invalid', 'not valid json {');

      await expect(store.get('invalid')).rejects.toThrow('Unable to parse stored value');
    });

    it('should handle typed data', async () => {
      interface User {
        name: string;
        age: number;
      }

      const user: User = { name: 'Alice', age: 30 };
      localStorage.setItem('user', JSON.stringify(user));

      const result = await store.get<User>('user');
      expect(result).toEqual(user);
      expect(result?.name).toBe('Alice');
    });
  });

  describe('set', () => {
    it('should store data as JSON', () => {
      const testData = { foo: 'bar', count: 123 };
      store.set('test', testData);

      const stored = localStorage.getItem('test');
      expect(stored).toBe(JSON.stringify(testData));
    });

    it('should handle primitive types', () => {
      store.set('string', 'hello');
      store.set('number', 42);
      store.set('boolean', true);

      expect(localStorage.getItem('string')).toBe('"hello"');
      expect(localStorage.getItem('number')).toBe('42');
      expect(localStorage.getItem('boolean')).toBe('true');
    });

    it('should handle arrays', () => {
      const arr = [1, 2, 3];
      store.set('array', arr);

      const stored = localStorage.getItem('array');
      expect(stored).toBe('[1,2,3]');
    });

    it('should overwrite existing values', () => {
      store.set('key', 'old');
      store.set('key', 'new');

      expect(localStorage.getItem('key')).toBe('"new"');
    });
  });

  describe('remove', () => {
    it('should remove a key from storage', () => {
      localStorage.setItem('test', 'value');
      expect(localStorage.getItem('test')).not.toBeNull();

      store.remove('test');
      expect(localStorage.getItem('test')).toBeNull();
    });

    it('should not throw when removing non-existent key', () => {
      expect(() => store.remove('non-existent')).not.toThrow();
    });
  });

  describe('hasKey', () => {
    it('should return true for existing keys', () => {
      localStorage.setItem('exists', 'value');
      expect(store.hasKey('exists')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(store.hasKey('does-not-exist')).toBe(false);
    });

    it('should return false after key is removed', () => {
      localStorage.setItem('temp', 'value');
      expect(store.hasKey('temp')).toBe(true);

      store.remove('temp');
      expect(store.hasKey('temp')).toBe(false);
    });
  });

  describe('integration', () => {
    it('should handle complete workflow', async () => {
      // Set data
      const encounter = {
        name: 'Dragon Fight',
        monsters: ['Adult Red Dragon', 'Kobold'],
        difficulty: 'Deadly'
      };

      store.set('encounter', encounter);
      expect(store.hasKey('encounter')).toBe(true);

      // Get data
      const retrieved = await store.get('encounter');
      expect(retrieved).toEqual(encounter);

      // Remove data
      store.remove('encounter');
      expect(store.hasKey('encounter')).toBe(false);

      // Verify it's gone
      const afterRemove = await store.get('encounter');
      expect(afterRemove).toBeNull();
    });
  });
});
