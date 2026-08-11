// Wrapper for db.service.js - plain JS module
// Usage in Vue: import { db } from '@/lib/db'

let dbInstance = null;

export async function initDb() {
  if (!dbInstance) {
    // Will be injected by AngularJS bootstrap
    dbInstance = window.dbService;
  }
  return dbInstance;
}

export const db = {
  ready: () => initDb().then(d => d.ready()),
  query: (sql, params) => initDb().then(d => d.query(sql, params))
};
