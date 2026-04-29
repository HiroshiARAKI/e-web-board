CREATE TABLE "auth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"email" text NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_oauth_flows" (
	"state" text PRIMARY KEY NOT NULL,
	"mode" text NOT NULL,
	"redirect_to" text,
	"shared_signup_token" text,
	"code_verifier" text NOT NULL,
	"nonce" text NOT NULL,
	"expires_at" text NOT NULL,
	"consumed_at" text,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_google_sub_unique";--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_accounts_provider_account_unique" ON "auth_accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
INSERT INTO "auth_accounts" ("id", "user_id", "provider", "provider_account_id", "email", "created_at")
SELECT 'credentials:' || "id", "id", 'credentials', "email", "email", "created_at"
FROM "users"
WHERE "auth_provider" = 'credentials' AND "password_hash" IS NOT NULL;--> statement-breakpoint
INSERT INTO "auth_accounts" ("id", "user_id", "provider", "provider_account_id", "email", "created_at")
SELECT 'google:' || "id", "id", 'google', "google_sub", "email", "created_at"
FROM "users"
WHERE "auth_provider" = 'google' AND "google_sub" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "auth_provider";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "google_sub";
