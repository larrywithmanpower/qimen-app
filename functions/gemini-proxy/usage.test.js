import { describe, it, expect } from 'vitest';
import { createUsage } from './usage.js';

// 假 Firestore：用路徑字串當 key，支援 collection/doc/collection/doc、get、runTransaction
function fakeDb(initial = {}) {
  const store = new Map(Object.entries(initial));
  const node = (path) => ({
    path,
    collection: (name) => ({ doc: (id) => node(`${path}/${name}/${id}`) }),
    get: async () => ({ exists: store.has(path), data: () => store.get(path) }),
  });
  const db = {
    store,
    collection: (name) => ({ doc: (id) => node(`${name}/${id}`) }),
    runTransaction: async (fn) => fn({
      get: (ref) => ref.get(),
      set: (ref, data, opts) => store.set(ref.path, opts?.merge ? { ...store.get(ref.path), ...data } : data),
    }),
  };
  return db;
}

describe('createUsage', () => {
  it('會員計數寫在 usage/{日期}/users/{uid}，滿了不再加', async () => {
    const db = fakeDb();
    const u = createUsage(db);
    for (let i = 0; i < 2; i++) expect(await u.consume('2026-10-22', { uid: 'A', limit: 2 })).toBe(true);
    expect(await u.consume('2026-10-22', { uid: 'A', limit: 2 })).toBe(false);
    expect(db.store.get('usage/2026-10-22/users/A')).toEqual({ count: 2 });
    // 另一個 uid 與 anon 互不影響
    expect(await u.consume('2026-10-22', { uid: 'B', limit: 2 })).toBe(true);
    expect(db.store.has('usage/2026-10-22')).toBe(false);
  });
  it('未登入計數寫在 usage/{日期}.anon', async () => {
    const db = fakeDb();
    const u = createUsage(db);
    expect(await u.consume('2026-10-22', { uid: null, limit: 1 })).toBe(true);
    expect(await u.consume('2026-10-22', { uid: null, limit: 1 })).toBe(false);
    expect(db.store.get('usage/2026-10-22')).toEqual({ anon: 1 });
  });
  it('used 只讀不扣；沒資料回 0', async () => {
    const db = fakeDb({ 'usage/2026-10-22': { anon: 4 }, 'usage/2026-10-22/users/A': { count: 3 } });
    const u = createUsage(db);
    expect(await u.used('2026-10-22', { uid: null })).toBe(4);
    expect(await u.used('2026-10-22', { uid: 'A' })).toBe(3);
    expect(await u.used('2026-10-22', { uid: 'Z' })).toBe(0);
    expect(await u.used('2026-10-23', { uid: null })).toBe(0);
  });
  it('spentUsd 讀 ai_cost_daily/{日期}.totalUsd；沒資料回 0', async () => {
    const u = createUsage(fakeDb({ 'ai_cost_daily/2026-10-22': { totalUsd: 1.25 } }));
    expect(await u.spentUsd('2026-10-22')).toBe(1.25);
    expect(await u.spentUsd('2026-10-23')).toBe(0);
  });
});
