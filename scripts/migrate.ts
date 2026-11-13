import { getDb } from "../src/db/client";

const db = getDb();
const version = db.pragma("user_version", { simple: true });
console.log(`Database ready at ${process.env.DATABASE_PATH ?? "./data/gitsift.db"}`);
console.log(`Schema version: ${version}`);
console.log(`FTS5: ${db.prepare("select sqlite_version() as v").get() ? "available" : "missing"}`);
