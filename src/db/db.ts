import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema.ts";

// for migrations
export const migrationClient = postgres(
  "postgres://postgres:postgres@0.0.0.0:6782/postgres",
  { max: 1 },
);

// for query purposes
const queryClient = postgres(
  "postgres://postgres:postgres@0.0.0.0:6782/postgres",
);
export const db = drizzle(queryClient, { schema });
