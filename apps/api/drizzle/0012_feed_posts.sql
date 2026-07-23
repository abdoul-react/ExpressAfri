CREATE TABLE "feed_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"media_type" text DEFAULT 'image' NOT NULL,
	"media_url" text NOT NULL,
	"thumbnail_url" text,
	"aspect_ratio" double precision DEFAULT 1 NOT NULL,
	"duration" text,
	"author_name" text DEFAULT 'AfriExpress' NOT NULL,
	"author_avatar" text,
	"link_url" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feed_post_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "feed_post_likes_post_id_customer_id_unique" UNIQUE("post_id","customer_id")
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feed_post_likes_post_id_feed_posts_id_fk') THEN
    ALTER TABLE "feed_post_likes" ADD CONSTRAINT "feed_post_likes_post_id_feed_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."feed_posts"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

