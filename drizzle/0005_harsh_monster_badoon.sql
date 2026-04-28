CREATE TABLE "account_deletion_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" text NOT NULL,
	"completed_at" text,
	"created_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	CONSTRAINT "account_deletion_requests_owner_user_id_unique" UNIQUE("owner_user_id"),
	CONSTRAINT "account_deletion_requests_token_unique" UNIQUE("token")
);
