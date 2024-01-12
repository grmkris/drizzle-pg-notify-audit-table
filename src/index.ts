import { db, migrationClient } from "./db/db.ts";
import {
  CustomersTable,
  InvoicesTable,
  ProductsTable,
  RecordVersion,
} from "./db/schema.ts";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";

migrate(drizzle(migrationClient), {
  migrationsFolder: "./drizzle",
}).then(async () => {
  console.log("Migration complete");
  console.log("Generating some data");
  await generateSomeData();
  console.log("Generated some data");
  await readFromAuditTable();
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
  const auditRecords = await db.query.RecordVersionTable.findMany({
    where: (record) => eq(record.tableName, "invoices"),
  });

  const records = z.array(RecordVersion).parse(auditRecords);

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

/**
 * Changes to a Record Over Time
 */
export const queryAuditRecordOverTime = async () => {};
