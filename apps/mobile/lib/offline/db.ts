import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

const DATABASE_NAME = "coopenergie.db";
const IS_WEB = Platform.OS === "web";

type CacheRow = {
  data: string;
};

type WebCacheEntry = {
  data: string;
  cachedAt: number;
};

const webCache: Record<"contributions" | "proposals" | "ledger_events", Map<string, Map<string, WebCacheEntry>>> = {
  contributions: new Map(),
  proposals: new Map(),
  ledger_events: new Map(),
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initialized = false;

async function getDb() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
}

export async function createTables() {
  if (initialized) {
    return;
  }

  if (IS_WEB) {
    initialized = true;
    return;
  }

  const db = await getDb();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS contributions (
      id TEXT PRIMARY KEY NOT NULL,
      cooperative_id TEXT NOT NULL,
      data TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY NOT NULL,
      cooperative_id TEXT NOT NULL,
      data TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ledger_events (
      id TEXT PRIMARY KEY NOT NULL,
      cooperative_id TEXT NOT NULL,
      data TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );
  `);

  initialized = true;
}

async function saveItems(
  tableName: "contributions" | "proposals" | "ledger_events",
  cooperativeId: string,
  items: Array<{ id: string } & Record<string, unknown>>,
) {
  await createTables();
  const now = Date.now();

  if (IS_WEB) {
    const tableCache = webCache[tableName];
    const cooperativeCache = tableCache.get(cooperativeId) ?? new Map<string, WebCacheEntry>();

    for (const item of items) {
      cooperativeCache.set(item.id, {
        data: JSON.stringify(item),
        cachedAt: now,
      });
    }

    tableCache.set(cooperativeId, cooperativeCache);
    return;
  }

  const db = await getDb();

  for (const item of items) {
    await db.runAsync(
      `
        INSERT OR REPLACE INTO ${tableName} (id, cooperative_id, data, cached_at)
        VALUES (?, ?, ?, ?)
      `,
      [item.id, cooperativeId, JSON.stringify(item), now],
    );
  }
}

async function getItems<T>(
  tableName: "contributions" | "proposals" | "ledger_events",
  cooperativeId: string,
): Promise<T[]> {
  await createTables();

  if (IS_WEB) {
    const entries = Array.from(
      (webCache[tableName].get(cooperativeId) ?? new Map<string, WebCacheEntry>()).values(),
    ).sort((left, right) => right.cachedAt - left.cachedAt);

    return entries
      .map((entry) => {
        try {
          return JSON.parse(entry.data) as T;
        } catch {
          return null;
        }
      })
      .filter((row): row is T => row !== null);
  }

  const db = await getDb();

  const rows = await db.getAllAsync<CacheRow>(
    `
      SELECT data
      FROM ${tableName}
      WHERE cooperative_id = ?
      ORDER BY cached_at DESC
    `,
    [cooperativeId],
  );

  return rows
    .map((row) => {
      try {
        return JSON.parse(row.data) as T;
      } catch {
        return null;
      }
    })
    .filter((row): row is T => row !== null);
}

export async function saveContributions(
  cooperativeId: string,
  items: Array<{ id: string } & Record<string, unknown>>,
) {
  await saveItems("contributions", cooperativeId, items);
}

export async function getContributions<T = Record<string, unknown>>(
  cooperativeId: string,
) {
  return getItems<T>("contributions", cooperativeId);
}

export async function saveProposals(
  cooperativeId: string,
  items: Array<{ id: string } & Record<string, unknown>>,
) {
  await saveItems("proposals", cooperativeId, items);
}

export async function getProposals<T = Record<string, unknown>>(
  cooperativeId: string,
) {
  return getItems<T>("proposals", cooperativeId);
}

export async function saveLedger(
  cooperativeId: string,
  items: Array<{ id: string } & Record<string, unknown>>,
) {
  await saveItems("ledger_events", cooperativeId, items);
}

export async function getLedger<T = Record<string, unknown>>(
  cooperativeId: string,
) {
  return getItems<T>("ledger_events", cooperativeId);
}
