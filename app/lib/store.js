// Wrapper for store.service.js - plain JS module
// Usage in Vue: import { store } from '@/lib/store'

let storeInstance = null;

function getStore() {
  if (!storeInstance) {
    storeInstance = window.storeService;
  }
  return storeInstance;
}

export const store = {
  get: (key) => getStore().get(key),
  set: (key, value) => getStore().set(key, value),
  hasKey: (key) => getStore().hasKey(key),
  remove: (key) => getStore().remove(key)
};
