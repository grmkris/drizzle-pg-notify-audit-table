import {
  integer,
  jsonb,
  numeric,
  pgSchema,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const ProductsTable = pgTable("products", {
  prodId: serial("prodId").primaryKey(),
  prodName: text("prodName").notNull(),
  price: numeric("price").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const Product = createSelectSchema(ProductsTable, {
  createdAt: z.coerce.date(),
});
export const NewProduct = createInsertSchema(ProductsTable);
export type Product = z.infer<typeof Product>;
export type NewProduct = z.infer<typeof NewProduct>;

export const CustomersTable = pgTable("customers", {
  custId: serial("custId").primaryKey(),
  firstname: text("firstname").notNull(),
  lastname: text("lastname").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const Customer = createSelectSchema(CustomersTable, {
  createdAt: z.coerce.date(),
});
export const NewCustomer = createInsertSchema(CustomersTable);
export type Customer = z.infer<typeof Customer>;
export type NewCustomer = z.infer<typeof NewCustomer>;

export const InvoicesTable = pgTable("invoices", {
  invId: serial("invId").primaryKey(),
  custId: integer("custId").notNull(),
  prodId: integer("prodId").notNull(),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const Invoice = createSelectSchema(InvoicesTable, {
  createdAt: z.coerce.date(),
});
export const NewInvoice = createInsertSchema(InvoicesTable);
export type Invoice = z.infer<typeof Invoice>;
export type NewInvoice = z.infer<typeof NewInvoice>;

/** create table audit.record_version(
 id             bigserial primary key,
 -- auditing metadata
 record_id      uuid, -- identifies a new record by it's table + primary key
 old_record_id  uuid, -- ^
 op             varchar(8) not null, -- INSERT/UPDATE/DELETE/TRUNCATE
 ts             timestamptz not null default now(),
 -- table identifiers
 table_oid      oid not null,  -- pg internal id for a table
 table_schema   name not null, -- audited table's schema name e.g. 'public'
 table_name     name not null, -- audited table's table name e.g. 'account'
 -- record data
 record         jsonb, -- contents of the new record
 old_record     jsonb  -- previous record contents (for UPDATE/DELETE)
 );

 -- index ts for time range filtering
 create index record_version_ts
 on audit.record_version
 using brin(ts);


 -- index table_oid for table filtering
 create index record_version_table_oid
 on audit.record_version
 using btree(table_oid);
 */
export const OPERATIONS = ["INSERT", "UPDATE", "DELETE", "TRUNCATE"] as const;
export const OP = z.enum(["INSERT", "UPDATE", "DELETE", "TRUNCATE"]);
export type OP = z.infer<typeof OP>;

export const AUDITED_TABLES = ["products", "customers", "invoices"] as const;
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
  record: z.union([Product, Customer, Invoice]),
  oldRecord: z.union([Product, Customer, Invoice]).optional(),
});

export type RecordVersion = z.infer<typeof RecordVersion>;
