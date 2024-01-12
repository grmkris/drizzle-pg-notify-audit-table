CREATE SCHEMA "audit";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"custId" serial PRIMARY KEY NOT NULL,
	"firstname" text NOT NULL,
	"lastname" text NOT NULL,
	"email" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
	"invId" serial PRIMARY KEY NOT NULL,
	"custId" integer NOT NULL,
	"prodId" integer NOT NULL,
	"quantity" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"prodId" serial PRIMARY KEY NOT NULL,
	"prodName" text NOT NULL,
	"price" numeric NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."record_version" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_id" text,
	"old_record_id" text,
	"op" text,
	"ts" timestamp DEFAULT now() NOT NULL,
	"table_oid" integer NOT NULL,
	"table_schema" text NOT NULL,
	"table_name" text NOT NULL,
	"record" jsonb,
	"old_record" jsonb
);
