import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure for Supabase compatibility
const connectionString = process.env.DATABASE_URL;

// Create postgres client with Supabase-optimized settings
const client = postgres(connectionString, {
  prepare: false, // Disable prepared statements for Supabase compatibility
  max: 10, // Connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
});

export const db = drizzle(client, { schema });
export { client as pool }; // Export for backward compatibility
