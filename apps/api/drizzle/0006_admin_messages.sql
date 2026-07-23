CREATE TABLE "admin_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"subject" text NOT NULL,
	"last_message" text,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"assigned_to" uuid,
	"unread" boolean DEFAULT true,
	"message_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"sender_id" text NOT NULL,
	"sender_name" text NOT NULL,
	"sender_type" text NOT NULL,
	"content" text NOT NULL,
	"attachments" jsonb DEFAULT '[]',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "internal_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_admin_id" uuid NOT NULL,
	"from_admin_name" text NOT NULL,
	"to_admin_id" uuid NOT NULL,
	"to_admin_name" text NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"thread" jsonb DEFAULT '[]',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "admin_tickets" ADD CONSTRAINT "admin_tickets_assigned_to_admins_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_admin_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."admin_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- FK removed: internal_messages stores admin info as text
