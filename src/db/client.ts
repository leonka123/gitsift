import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { migrate } from "./schema";

const globalForDb = globalThis as unknown as { __gitsiftDb?: Database.Database };

export function dbPath(): string {
  const configured = process.env.DATABASE_PATH?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
  }
  return path.join(process.cwd(), "data", "gitsift.db");
}

export function getDb(): Database.Database {
  if (globalForDb.__gitsiftDb) return globalForDb.__gitsiftDb;

  const file = dbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  migrate(db);

  globalForDb.__gitsiftDb = db;
  return db;
}

export function closeDb(): void {
  if (globalForDb.__gitsiftDb) {
    globalForDb.__gitsiftDb.close();
    globalForDb.__gitsiftDb = undefined;
  }
}
