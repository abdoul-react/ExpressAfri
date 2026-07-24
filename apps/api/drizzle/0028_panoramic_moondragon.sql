CREATE TABLE "loyalty_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"type" varchar(32) NOT NULL,
	"points" integer NOT NULL,
	"balance" integer NOT NULL,
	"description" text,
	"reference_id" uuid,
	"reference_type" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
