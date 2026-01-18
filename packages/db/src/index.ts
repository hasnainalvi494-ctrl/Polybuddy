import { config } from "dotenv";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

// Load .env from workspace root and local directories
const cwd = process.cwd();
config({ path: resolve(cwd, ".env") });
config({ path: resolve(cwd, "../.env") });
config({ path: resolve(cwd, "../../.env") });

// Fallback to default local database if not set
const connectionString = process.env.DATABASE_URL || "postgresql://polybuddy:polybuddy@localhost:5432/polybuddy";

const client = postgres(connectionString);

export const db = drizzle(client, { schema });

export * from "./schema/index.js";
export type Database = typeof db;
