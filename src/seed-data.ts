import { db } from "./db/db.ts";
import {
  CommentsTable,
  NewComment,
  NewPost,
  NewUser,
  PostsTable,
  RecordVersion,
  UsersTable,
} from "./db/schema.ts";
import { generateMock } from "@anatine/zod-mock";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";

/**
 * We need to map the table name to the table OID in postgres, it is different for each database
 * We should somehow automate this to not have it hardcoded in real app
 */
export const TABLE_OID_MAP = {
  invoices: 16418,
  products: 16426,
} as const;

export const generateSomeData = async () => {
  // create 10 users
  const createdUsers = [];
  const createdPosts = [];
  const createdComments = [];
  for (let i = 0; i < 10; i++) {
    const a = await db
      .insert(UsersTable)
      .values(generateMock(NewUser))
      .returning()
      .execute();
    createdUsers.push(a[0]);
  }
  for (let i = 0; i < 10; i++) {
    const a = await db
      .insert(PostsTable)
      .values({
        ...generateMock(NewPost),
        createdBy: createdUsers[i].id,
      })
      .returning()
      .execute();

    createdPosts.push(a[0]);
  }

  // create 10 comments
  for (let i = 0; i < 10; i++) {
    const a = await db
      .insert(CommentsTable)
      .values({
        ...generateMock(NewComment),
        postId: createdPosts[i].id,
        createdBy: createdUsers[i].id,
      })
      .returning()
      .execute();

    createdComments.push(a[0]);
  }

  // update each comments and post few times
  for (let i = 0; i < 10; i++) {
    await db
      .update(CommentsTable)
      .set({
        ...generateMock(NewComment),
        updatedAt: new Date(),
        updatedBy: createdUsers[i].id,
      })
      .where(eq(CommentsTable.id, createdComments[i].id))
      .execute();
  }

  for (let i = 0; i < 10; i++) {
    await db
      .update(PostsTable)
      .set({
        ...generateMock(NewPost),
        createdBy: createdUsers[i].id,
      })
      .where(eq(PostsTable.id, createdPosts[i].id))
      .execute();
  }
};

export async function readFromAuditTable() {
  // read from audit table
  // limit output to just 5 records to keep the output small
  const auditRecords = await db.query.RecordVersionTable.findMany({
    where: (record) => eq(record.tableName, "posts"),
    limit: 5,
  });

  console.log("readFromAuditTable auditRecords length", auditRecords.length);

  const records = z.array(RecordVersion).safeParse(auditRecords);
  if (!records.success) {
    console.error("readFromAuditTable records", records.error);
    throw new Error("Failed to parse records");
  }
  console.log("readFromAuditTable found records", records.data.length);
  for (const record of records.data) {
    console.log(`readFromAuditTable ${record.tableName} record`, record.id);
  }
}

/**
 * Changes to a Table in a Time Range
 */
export const queryAuditTableInTimeRange = async () => {
  const results = await db.query.RecordVersionTable.findMany({
    where: (record) => {
      return and(
        eq(record.tableName, "posts"),
        gte(record.ts, new Date("2021-01-01")),
      );
    },
  });

  const records = z.array(RecordVersion).parse(results);

  for (const record of records) {
    console.log(
      `queryAuditTableInTimeRange ${record.tableName} record`,
      record.id,
    );
  }
};

/**
 * Changes to a Record Over Time
 */
export const queryAuditRecordOverTime = async (props: {
  tableName: "invoices" | "products";
  recordId: string;
}) => {
  console.log("queryAuditRecordOverTime props", props);
  /**
   * We need to calculate the record ID for the record we want to query, we could do this in js, but here we query helper function in the sql table
   * In production, we would probably want to do this in js
   */
  const sqlstmt = sql`SELECT audit.to_record_id(${TABLE_OID_MAP[
    props.tableName
  ].toString()}, array['id'], jsonb_build_object('id', '100'))`;

  const record = await db.execute(sqlstmt);
  const recordID = z.string().parse(record[0].to_record_id);

  console.log("queryAuditRecordOverTime recordID", recordID);

  if (!recordID) throw new Error("No record ID found");

  /**
   * SELECT *
   * FROM audit.record_version
   * WHERE record_id = '28ac85ec-6987-5265-b209-8f44bf288c8f'
   *    OR old_record_id = '28ac85ec-6987-5265-b209-8f44bf288c8f';
   */
  const results = await db.query.RecordVersionTable.findMany({
    where: (record, { eq }) =>
      eq(record.recordId, recordID) || eq(record.oldRecordId, recordID),
  });

  console.log("queryAuditRecordOverTime results", results);

  const records = z.array(RecordVersion).safeParse(results);
  if (!records.success) {
    throw new Error("Failed to parse records");
  }
  console.log("queryAuditRecordOverTime found records", records.data.length);

  for (const record of records.data) {
    console.log(
      `queryAuditRecordOverTime ${record.tableName} record`,
      record.id,
    );
  }
};
