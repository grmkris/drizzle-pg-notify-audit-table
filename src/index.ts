import { db, migrationClient } from "./db/db.ts";
import {
  CustomersTable,
  InvoicesTable,
  ProductsTable,
  RecordVersion,
} from "./db/schema.ts";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, desc, eq, gte, or, sql } from "drizzle-orm";
import { z } from "zod";

migrate(drizzle(migrationClient), {
  migrationsFolder: "./drizzle",
}).then(async () => {
  console.log("Migration complete");
  console.log("Generating some data");
  await generateSomeData();
  console.log("Generated some data");
  console.log("Read from audit table");
  await readFromAuditTable();
  console.log("Done Read from audit table");
  console.log("Read from audit table - queryAuditRecordOverTime");
  await queryAuditRecordOverTime({
    tableName: "invoices",
    recordId: "3",
  });
});

const generateSomeData = async () => {
  const latestCustomer = await db.query.CustomersTable.findFirst({
    orderBy: (posts, { asc }) => [desc(posts.custId)],
  });
  // create 10 customers
  for (
    let i = (latestCustomer?.custId ?? 0) + 1;
    i < (latestCustomer?.custId ?? 0) + 10 + 1;
    i++
  ) {
    await db
      .insert(CustomersTable)
      .values({
        custId: i,
        email: `email${1}@emai.com`,
        lastname: `lastname${i}`,
        firstname: `firstname${i}`,
      })
      .execute();
  }

  // create 10 products
  const latestProduct = await db.query.ProductsTable.findFirst({
    orderBy: (posts, { asc }) => [desc(posts.prodId)],
  });
  for (
    let i = (latestProduct?.prodId ?? 0) + 1;
    i < (latestProduct?.prodId ?? 0) + 10 + 1;
    i++
  ) {
    await db
      .insert(ProductsTable)
      .values({
        prodName: `prodName${i}`,
        price: "100",
        createdAt: new Date(),
        prodId: i,
      })
      .execute();
  }

  // create 10 invoices
  const latestInvoice = await db.query.InvoicesTable.findFirst({
    orderBy: (posts, { asc }) => [desc(posts.invId)],
  });
  for (
    let i = (latestInvoice?.invId ?? 0) + 1;
    i < (latestInvoice?.invId ?? 0) + 10 + 1;
    i++
  ) {
    await db
      .insert(InvoicesTable)
      .values({
        prodId: i,
        custId: i,
        quantity: i,
      })
      .execute();
  }

  // randomly update some invoices
  for (let i = 0; i < 10; i++) {
    await db
      .update(InvoicesTable)
      .set({
        prodId: i,
        custId: i,
        quantity: i,
      })
      .where(eq(InvoicesTable.invId, i))
      .execute();
  }
};

async function readFromAuditTable() {
  // read from audit table
  // limit output to just 5 records to keep the output small
  const auditRecords = await db.query.RecordVersionTable.findMany({
    where: (record) => eq(record.tableName, "invoices"),
    limit: 5,
  });

  const records = z.array(RecordVersion).parse(auditRecords);
  console.log("readFromAuditTable found records", records.length);
  for (const record of records) {
    switch (record.tableName) {
      case "invoices":
        console.log("readFromAuditTable invoice", record);
        break;
      case "customers":
        console.log("readFromAuditTable customer", record);
        break;
      case "products":
        console.log("readFromAuditTable product", record);
        break;
    }
  }
}

/**
 * Changes to a Table in a Time Range
 */
const queryAuditTableInTimeRange = async () => {
  const results = await db.query.RecordVersionTable.findMany({
    where: (record) => {
      return and(
        eq(record.tableName, "invoices"),
        gte(record.ts, new Date("2021-01-01")),
      );
    },
  });

  const records = z.array(RecordVersion).parse(results);

  for (const record of records) {
    switch (record.tableName) {
      case "invoices":
        console.log("invoice", record);
        break;
      case "customers":
        console.log("customer", record);
        break;
      case "products":
        console.log("product", record);
        break;
    }
  }



};

const calculateRecordId = (tableName: string, record: any) => {};

export const TABLE_OID_MAP = {
  invoices: 16590,
  products: 16598,
} as const;


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
  const sqlstmt = sql`SELECT audit.to_record_id(${
    TABLE_OID_MAP[props.tableName].toString()
  }, array['id'], jsonb_build_object('id', '3'))`;

  const record = await db.execute(sqlstmt);
  const recordID = record[0].to_record_id;

  console.log("queryAuditRecordOverTime recordID", recordID);

  if (!recordID) throw new Error("No record ID found");


  /**
   * SELECT *
   * FROM audit.record_version
   * WHERE record_id = '28ac85ec-6987-5265-b209-8f44bf288c8f'
   *    OR old_record_id = '28ac85ec-6987-5265-b209-8f44bf288c8f';
   */
  const results = await db.query.RecordVersionTable.findMany({
    where: (record) => {
      return or(
        eq(record.recordId, recordID),
        eq(record.oldRecordId, recordID),
      );
    },
  });

  const records = z.array(RecordVersion).parse(results);
  console.log("queryAuditRecordOverTime found records", records.length);

  for (const record of records) {
    switch (record.tableName) {
      case "invoices":
        console.log("invoice", record);
        break;
      case "customers":
        console.log("customer", record);
        break;
      case "products":
        console.log("product", record);
        break;
    }
  }
};
