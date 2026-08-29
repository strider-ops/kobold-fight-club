/**
 * Tests for Database Service
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db';
import type { SQLJsDatabase, SQLJsStatic } from '@/types';

describe('DatabaseService', () => {
  let mockDatabase: SQLJsDatabase;
  let mockSQL: SQLJsStatic;

  beforeEach(() => {
    // Reset the service's internal state
    (db as any).ready = null;

    // Create mock database
    mockDatabase = {
      exec: vi.fn().mockReturnValue([
        {
          columns: ['id', 'name', 'cr'],
          values: [
            ['1', 'Goblin', '1/4'],
            ['2', 'Dragon', '20'],
          ],
        },
      ]),
      close: vi.fn(),
    } as any;

    // Create mock SQL constructor
    mockSQL = {
      Database: vi.fn().mockReturnValue(mockDatabase),
    } as any;

    // Mock window.initSqlJs
    global.window = {
      initSqlJs: vi.fn().mockResolvedValue(mockSQL),
    } as any;

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    } as any);
  });

  describe('open', () => {
    it('should load the database successfully', async () => {
      const database = await db.open();

      expect(database).toBe(mockDatabase);
      expect(window.initSqlJs).toHaveBeenCalledWith({
        locateFile: expect.any(Function),
      });
      expect(fetch).toHaveBeenCalledWith('/data/monsters.db');
    });

    it('should return same database instance on subsequent calls', async () => {
      const db1 = await db.open();
      const db2 = await db.open();

      expect(db1).toBe(db2);
      expect(window.initSqlJs).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error if sql.js is not loaded', async () => {
      global.window.initSqlJs = undefined as any;

      await expect(db.open()).rejects.toThrow('sql.js is not loaded');
    });

    it('should throw error if database fetch fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any);

      await expect(db.open()).rejects.toThrow('Could not fetch /data/monsters.db (404 Not Found)');
    });

    it('should not cache failed database load', async () => {
      // First call fails
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      } as any);

      await expect(db.open()).rejects.toThrow('Could not fetch');

      // Second call should retry (not use cached rejection)
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      } as any);

      const database = await db.open();
      expect(database).toBe(mockDatabase);
    });

    it('should configure sql.js with correct WASM path', async () => {
      await db.open();

      const config = (window.initSqlJs as any).mock.calls[0][0];
      const locateFile = config.locateFile;

      expect(locateFile('sql-wasm.wasm')).toBe('/vendor/sql.js/sql-wasm.wasm');
      expect(locateFile('worker.js')).toBe('/vendor/sql.js/worker.js');
    });
  });

  describe('query', () => {
    it('should execute query and return row objects', async () => {
      const result = await db.query('SELECT * FROM monsters');

      expect(mockDatabase.exec).toHaveBeenCalledWith('SELECT * FROM monsters', []);
      expect(result).toEqual([
        { id: '1', name: 'Goblin', cr: '1/4' },
        { id: '2', name: 'Dragon', cr: '20' },
      ]);
    });

    it('should handle parameterized queries', async () => {
      await db.query('SELECT * FROM monsters WHERE cr = ?', ['1/4']);

      expect(mockDatabase.exec).toHaveBeenCalledWith(
        'SELECT * FROM monsters WHERE cr = ?',
        ['1/4']
      );
    });

    it('should return empty array for empty results', async () => {
      mockDatabase.exec = vi.fn().mockReturnValue([]);

      const result = await db.query('SELECT * FROM monsters WHERE id = 999');

      expect(result).toEqual([]);
    });

    it('should handle typed queries', async () => {
      interface Monster {
        id: string;
        name: string;
        cr: string;
      }

      const result = await db.query<Monster>('SELECT * FROM monsters');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Goblin');
      expect(result[1].name).toBe('Dragon');
    });

    it('should handle single column results', async () => {
      mockDatabase.exec = vi.fn().mockReturnValue([
        {
          columns: ['name'],
          values: [['Goblin'], ['Dragon'], ['Kobold']],
        },
      ]);

      const result = await db.query('SELECT name FROM monsters');

      expect(result).toEqual([{ name: 'Goblin' }, { name: 'Dragon' }, { name: 'Kobold' }]);
    });

    it('should handle multiple columns correctly', async () => {
      mockDatabase.exec = vi.fn().mockReturnValue([
        {
          columns: ['name', 'hp', 'ac', 'cr'],
          values: [['Goblin', 7, 15, '1/4']],
        },
      ]);

      const result = await db.query('SELECT name, hp, ac, cr FROM monsters WHERE id = 1');

      expect(result).toEqual([{ name: 'Goblin', hp: 7, ac: 15, cr: '1/4' }]);
    });

    it('should call open before executing query', async () => {
      const openSpy = vi.spyOn(db as any, 'open');

      await db.query('SELECT * FROM monsters');

      expect(openSpy).toHaveBeenCalled();
    });

    it('should handle null values in results', async () => {
      mockDatabase.exec = vi.fn().mockReturnValue([
        {
          columns: ['name', 'description'],
          values: [
            ['Goblin', null],
            ['Dragon', 'A mighty dragon'],
          ],
        },
      ]);

      const result = await db.query('SELECT name, description FROM monsters');

      expect(result).toEqual([
        { name: 'Goblin', description: null },
        { name: 'Dragon', description: 'A mighty dragon' },
      ]);
    });
  });

  describe('integration', () => {
    it('should handle full workflow', async () => {
      // Open database
      const database = await db.open();
      expect(database).toBeDefined();

      // Query data
      const monsters = await db.query('SELECT * FROM monsters');
      expect(monsters).toHaveLength(2);

      // Parameterized query
      const filtered = await db.query('SELECT * FROM monsters WHERE cr = ?', ['1/4']);
      expect(mockDatabase.exec).toHaveBeenCalledWith(
        'SELECT * FROM monsters WHERE cr = ?',
        ['1/4']
      );
    });
  });
});
