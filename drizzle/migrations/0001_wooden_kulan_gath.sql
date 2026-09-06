CREATE TABLE "app_release_policies" (
	"platform" text PRIMARY KEY NOT NULL,
	"minimum_version" text NOT NULL,
	"latest_version" text NOT NULL,
	"store_url" text NOT NULL,
	"release_notes" jsonb,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_release_policies_platform_check" CHECK ("app_release_policies"."platform" in ('ios', 'android')),
	CONSTRAINT "app_release_policies_minimum_version_format_check" CHECK ("app_release_policies"."minimum_version" ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
	CONSTRAINT "app_release_policies_latest_version_format_check" CHECK ("app_release_policies"."latest_version" ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
	CONSTRAINT "app_release_policies_minimum_not_above_latest_check" CHECK (string_to_array("app_release_policies"."minimum_version", '.')::int[] <= string_to_array("app_release_policies"."latest_version", '.')::int[]),
	CONSTRAINT "app_release_policies_store_url_check" CHECK ("app_release_policies"."store_url" ~ '^https://')
);
--> statement-breakpoint
ALTER TABLE "app_release_policies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "select_app_release_policies" ON "app_release_policies" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);