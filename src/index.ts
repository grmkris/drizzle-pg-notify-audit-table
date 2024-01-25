import { db, migrationClient } from "./db/db.ts";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { Hono } from "hono";
import { streamText } from "hono/streaming";
import {
  createNewComment,
  createNewPost,
  generateSomeData,
  queryAuditRecordOverTime,
  readFromAuditTable, updateRandomComment, updateRandomPost,
} from "./seed-data.ts";
import {getDBListener} from "./db/db-listener.ts";
/**
 * Record ID you want to use for historical data
 */
export const RECORD_ID = "100" as const;

const setupListeners = () =>
  Promise.all([
    new Promise<void>((resolve) => {
      getDBListener({
        channel: "new_posts",
        onNotify: (payload) => {
          // autocomplete works 😍
          console.log("listener received new post", payload.postName);
        },
        onListen: async () => {
          console.log("Listening for new posts");
          resolve();
        },
      });
    }),
    new Promise<void>((resolve) => {
      getDBListener({
        channel: "new_comments",
        onNotify: (payload) => {
          // autocomplete works 😍
          console.log("listener received new comment", payload.comment);
        },
        onListen: async () => {
          console.log("Listening for new comments");
          resolve();
        },
      });
    }),

    new Promise<void>((resolve) => {
      getDBListener({
        channel: "audit_changes",
        onNotify: (payload) => {
          // autocomplete works 😍
        },
        onListen: async () => {
          console.log("Listening for audit changes");
          resolve();
        },
      });
    }),
  ]);

migrate(drizzle(migrationClient), {
  migrationsFolder: "./drizzle",
}).then(async () => {
  console.log("Migration complete");
  console.log("Generating some data");
  // setup listeners
  // await setupListeners();
  // await generateSomeData();
  console.log("Generated some data");
  console.log("Read from audit table");
  await readFromAuditTable();
  console.log("Done Read from audit table");
  console.log("Read from audit table - queryAuditRecordOverTime");
  await queryAuditRecordOverTime({
    tableName: "invoices",
    recordId: RECORD_ID,
  });
});

const app = new Hono();

app.get("/", async (c) => {
  const posts = await db.query.PostsTable.findMany();
  return c.json({ posts });
});

app.get("/generate", async (c) => {
  await generateSomeData();
  return c.json({ success: true });
});

app.get("/stream", (c) => {
  return streamText(c, async (stream) => {
    // Write a Uint8Array.
    await stream.writeln("Hello world!, listening for new db events");
    // Pipe a readable stream.
    const listener = await getDBListener({
      channel: "audit_changes",
      onNotify: (payload) => {
        // autocomplete works 😍
        console.log("stream listener received new update in audit table", payload.tableName);
        stream.writeln(`stream listener received new update in audit table: ${payload.tableName}`);
        stream.writeln(JSON.stringify(payload, null, 2));
      },
      onListen: async () => {
        console.log("Listening for new posts");
      },
    });

    console.log("stream listener", listener);
    // Write a text with a new line ('\n').
    // Wait 100 second.
    await stream.sleep(100000);
    // Write a text without a new line.
    await stream.write("Stream ended!");

    console.log("stream listener", listener.state.status);

    // Write a process to be executed when aborted.
    await stream.onAbort(async () => {
      console.log("Aborted!");
    });
  });
});

app.get("/create-post", async (c) => {
    return c.json(await createNewPost())
})

app.get("/create-comment", async (c) => {
    return c.json(await createNewComment())
})

app.get("/update-post", async (c) => {
    return c.json(await updateRandomPost())
})

app.get("/update-comment", async (c) => {
    return c.json(await updateRandomComment())
})


export default app;
