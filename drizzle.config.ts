import type { Config } from "drizzle-kit";


export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    host: "localhost",
    port: 6782,
    user: "postgres",
    password: "postgres",
    database: "postgres",
  },
} satisfies Config;
