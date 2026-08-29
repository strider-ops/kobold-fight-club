/**
 * Database Service
 *
 * SQLite database wrapper using sql.js (WASM-based SQLite).
 * Loads the monster database and provides query interface.
 */

import type { SQLJsDatabase, SQLJsStatic, InitSqlJsConfig } from '@/types';

const WASM_PATH = '/vendor/sql.js/';
const DB_PATH = '/data/monsters.db';

class DatabaseService {
  private ready: Promise<SQLJsDatabase> | null = null;

  /**
   * Opens the database. Returns the same promise on subsequent calls
   * so the database is only loaded once per session.
   */
  async open(): Promise<SQLJsDatabase> {
    if (this.ready) {
      return this.ready;
    }

    if (typeof window.initSqlJs !== 'function') {
      throw new Error(
        'sql.js is not loaded — check the vendor/sql.js script tag in index.html'
      );
    }

    this.ready = (async () => {
      const config: InitSqlJsConfig = {
        locateFile: (file: string) => WASM_PATH + file,
      };

      const SQL = (await window.initSqlJs(config)) as SQLJsStatic;

      const response = await fetch(DB_PATH);
      if (!response.ok) {
        throw new Error(
          `Could not fetch ${DB_PATH} (${response.status} ${response.statusText})`
        );
      }

      const buffer = await response.arrayBuffer();
      return new SQL.Database(new Uint8Array(buffer));
    })();

    // Don't cache a rejection — transient fetch failures shouldn't permanently
    // poison the service for the rest of the session
    this.ready.catch(() => {
      this.ready = null;
    });

    return this.ready;
  }

  /**
   * Run a SQL query and get plain row objects back.
   *
   * sql.js returns { columns: [...], values: [[...]] }, which is compact but
   * awkward at the call site, so it is zipped into objects here.
   *
   * @param sql SQL query string
   * @param params Query parameters (for prepared statements)
   * @returns Array of row objects
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const database = await this.open();
    const result = database.exec(sql, params);

    if (!result.length) {
      return [];
    }

    const columns = result[0].columns;
    return result[0].values.map((row) => {
      const out: any = {};
      for (let i = 0; i < columns.length; i++) {
        out[columns[i]] = row[i];
      }
      return out as T;
    });
  }
}

// Export singleton instance
export const db = new DatabaseService();
