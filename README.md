# drizzle-pg-notify-audit-table

## Problem

1. You have some tables in your database that you want to **audit**. You want to know who changed what and when. You want to be able to query this data easily and see the changes over time.

2. You want to be able to subscribe to changes in the database and be notified in real-time. 

## Solution
1. Audit
- A generic audit table, with triggers on the tables you want to audit, that will automatically insert a row into the audit table when a row is inserted, updated, or deleted.
- Fully typed objects using TypeScript / ZOD / ORM Drizzle
- SQL code is defined here: 
  - [0002_classy_war_machine.sql](drizzle%2F0002_classy_war_machine.sql)
  - [0003_jazzy_karen_page.sql](drizzle%2F0003_jazzy_karen_page.sql)
- Drizzle schema: 
  - https://github.com/grmkris/drizzle-supa-audit-example/blob/29ce82ff5588f9fd2fd2155c4a799bf8c9bb3f91/src/db/schema.ts#L108-L121
- Example query usage: 
  - https://github.com/grmkris/drizzle-supa-audit-example/blob/29ce82ff5588f9fd2fd2155c4a799bf8c9bb3f91/src/seed-data.ts#L137-L183


2. Notifications
   - using NOTIFY/LISTEN to subscribe to changes in the database and be notified in real-time. https://www.postgresql.org/docs/current/sql-notify.html
   - Fully typed events with payload using TypeScript / ZOD / ORM Drizzle
- Notify triggers (SQL):
  - [0005_fresh_maria_hill.sql](drizzle%2F0005_fresh_maria_hill.sql)
  - [0004_naive_hammerhead.sql](drizzle%2F0004_naive_hammerhead.sql)
- Typescript / Zod code and function to listen to notifications:
  - [db-listener.ts](src%2Fdb%2Fdb-listener.ts)

Example repository integrating: 
- https://orm.drizzle.team/docs/overview
- https://zod.dev/
- https://www.postgresql.org/
- https://github.com/supabase/supa_audit
  - https://supabase.com/blog/postgres-audit
- https://www.postgresql.org/docs/current/sql-notify.html

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run dev
```

This example projects implements 3 tables:
- users
- posts (with a foreign key to users)
- comments (with a foreign key to users and posts)
- record_version (stored in a audit table)

Server:
- http://localhost:3000 -> list all posts  
- http://localhost:3000/stream -> stream all audit table changes  
- http://localhost:3000/generate -> generate random posts and comments  
  http://localhost:3000/create-post -> create a post  
  http://localhost:3000/create-comment -> create a comment  
  http://localhost:3000/update-post -> update a random post  
  http://localhost:3000/update-comment -> update a random comment  
