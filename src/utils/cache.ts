import { get, set } from 'idb-keyval';

const TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface CacheEntry {
  value: string;
  timestamp: number;
}

function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function makePalaceHash(
  question: string,
  palaceData: { name: string; star: string; door: string; god: string; heavenStem: string }
): string {
  const key = [question, palaceData.name, palaceData.star, palaceData.door, palaceData.god, palaceData.heavenStem].join('|');
  return djb2Hash(key);
}

export function buildCacheKey(
  question: string,
  palaceData: { name: string; star: string; door: string; god: string; heavenStem: string },
  contextKey: string,
  promptVersion: string
): string {
  return `${makePalaceHash(question, palaceData)}_${contextKey}_${promptVersion}`;
}

export async function getCached(key: string): Promise<string | null> {
  try {
    const entry = await get<CacheEntry>(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > TTL_MS) return null;
    return entry.value;
  } catch {
    return null;
  }
}

export async function setCached(key: string, value: string): Promise<void> {
  try {
    await set(key, { value, timestamp: Date.now() } satisfies CacheEntry);
  } catch {
    // IndexedDB 不可用時靜默失敗
  }
}
