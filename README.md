# drizzle-pg-audit-table

## Problem

You have some tables in your database that you want to audit. You want to know who changed what and when. You want to be able to query this data easily and see the changes over time.

## Solution
- A generic audit table, with triggers on the tables you want to audit, that will automatically insert a row into the audit table when a row is inserted, updated, or deleted.
- Fully typed with TypeScript


Example repository integrating: 
- https://orm.drizzle.team/docs/overview
- https://zod.dev/
- https://www.postgresql.org/
- https://github.com/supabase/supa_audit
  - https://supabase.com/blog/postgres-audit


To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.0.17. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
