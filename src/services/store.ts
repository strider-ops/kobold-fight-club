/**
 * LocalStorage Service
 *
 * Simple wrapper around browser localStorage with Promise-based API
 * and type-safe getters/setters.
 */

export interface StoreService {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, data: T): void;
  remove(key: string): void;
  hasKey(key: string): boolean;
}

class Store implements StoreService {
  /**
   * Retrieve data from localStorage
   * @param key Storage key
   * @returns Promise resolving to stored data or null if not found
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (ex) {
      throw new Error(`Unable to parse stored value for ${key}: ${ex}`);
    }
  }

  /**
   * Store data in localStorage
   * @param key Storage key
   * @param data Data to store (will be JSON stringified)
   */
  set<T = any>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (ex) {
      throw new Error(`Unable to store value for ${key}: ${ex}`);
    }
  }

  /**
   * Remove a key from localStorage
   * @param key Storage key to remove
   */
  remove(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * Check if a key exists in localStorage
   * @param key Storage key to check
   * @returns true if key exists
   */
  hasKey(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }
}

// Export singleton instance
export const store = new Store();
