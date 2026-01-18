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

// Configure connection pool for Railway PostgreSQL
// Railway's free/starter tier has limited connections (~20)
const client = postgres(connectionString, {
  max: 10, // Maximum connections in pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 30, // Connection timeout in seconds
  max_lifetime: 60 * 5, // Max connection lifetime: 5 minutes
  prepare: false, // Disable prepared statements for better compatibility
});

export const db = drizzle(client, { schema });

export * from "./schema/index.js";
export type Database = typeof db;
