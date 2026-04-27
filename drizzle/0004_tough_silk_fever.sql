CREATE TABLE "device_auth_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_token_hash" text NOT NULL,
	"last_full_auth_at" text NOT NULL,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	CONSTRAINT "device_auth_grants_device_token_hash_unique" UNIQUE("device_token_hash")
);
--> statement-breakpoint
ALTER TABLE "device_auth_grants" ADD CONSTRAINT "device_auth_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;