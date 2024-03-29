import {
  integer,
  jsonb,
  pgSchema,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { camelCase, mapKeys } from "lodash";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// Define the camelCaseKeys function
export const camelCaseKeys = (object: unknown) =>
  mapKeys(object as Record<string, unknown>, (_, key) => camelCase(key));

/** Users Table */
export const UsersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstname: text("firstname").notNull(),
  lastname: text("lastname").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const User = createSelectSchema(UsersTable, {
  createdAt: z.coerce.date(),
});
export const NewUser = createInsertSchema(UsersTable).omit({
  id: true,
  createdAt: true,
});
export type User = z.infer<typeof User>;
export type NewUser = z.infer<typeof NewUser>;

/** Posts Table */
export const PostsTable = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  postName: text("post_name").notNull(),
  postTitle: text("post_title").notNull(),
  postContent: text("post_content").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => UsersTable.id)
    .notNull(),
  updatedBy: uuid("updated_by").references(() => UsersTable.id),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const Post = createSelectSchema(PostsTable, {
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
});
export const NewPost = createInsertSchema(PostsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: true,
});
export type Post = z.infer<typeof Post>;
export type NewPost = z.infer<typeof NewPost>;

/** Comments Table */
export const CommentsTable = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  comment: text("comment").notNull(),
  postId: uuid("post_id")
    .notNull()
    .references(() => PostsTable.id)
    .notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => UsersTable.id)
    .notNull(),
  updatedBy: uuid("updated_by").references(() => UsersTable.id),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const Comment = createSelectSchema(CommentsTable, {
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
});
export const NewComment = createInsertSchema(CommentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: true,
  createdBy: true,
  postId: true,
});
export type Comment = z.infer<typeof Comment>;
export type NewComment = z.infer<typeof NewComment>;

/** Record Version Table */
export const OPERATIONS = ["INSERT", "UPDATE", "DELETE", "TRUNCATE"] as const;
export const OP = z.enum(["INSERT", "UPDATE", "DELETE", "TRUNCATE"]);
export type OP = z.infer<typeof OP>;

export const AUDITED_TABLES = ["users", "posts", "comments"] as const;
export const AUDITED_TABLE = z.enum(AUDITED_TABLES);
export type AUDITED_TABLE = z.infer<typeof AUDITED_TABLE>;

export const auditSchema = pgSchema("audit");
export const RecordVersionTable = auditSchema.table("record_version", {
  id: serial("id").primaryKey(),
  recordId: text("record_id"),
  oldRecordId: text("old_record_id"),
  op: text("op", { enum: OPERATIONS }),
  ts: timestamp("ts").defaultNow().notNull(),
  tableOid: integer("table_oid").notNull(),
  tableSchema: text("table_schema").notNull(),
  tableName: text("table_name", {
    enum: AUDITED_TABLES,
  }).notNull(),
  record: jsonb("record"),
  oldRecord: jsonb("old_record"),
});

export const RecordVersion = createSelectSchema(RecordVersionTable, {
  ts: z.coerce.date(),
  op: OP,
  tableName: AUDITED_TABLE,
  record: z.preprocess(camelCaseKeys, z.union([User, Post, Comment])),
  oldRecord: z
    .preprocess(camelCaseKeys, z.union([User, Post, Comment]))
    .optional(),
});

export type RecordVersion = z.infer<typeof RecordVersion>;
