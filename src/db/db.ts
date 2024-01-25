import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema.ts";
import { Post, Comment } from "./schema.ts";
import { z } from "zod";
import { camelCaseKeys } from "./schema.ts";
import { RecordVersion } from "./schema.ts";

export const migrationClient = postgres(
  "postgres://postgres:postgres@0.0.0.0:6782/postgres",
  { max: 1 },
);

export const postgresClient = postgres(
  "postgres://postgres:postgres@0.0.0.0:6782/postgres",
);
export const db = drizzle(postgresClient, { schema });
