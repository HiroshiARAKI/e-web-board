ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'general';--> statement-breakpoint
ALTER TABLE "boards" ADD COLUMN "owner_user_id" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "owner_user_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "attribute" text DEFAULT 'shared' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "owner_user_id" text;--> statement-breakpoint
DO $$
DECLARE
    scoped_owner_id text;
BEGIN
    SELECT "id"
    INTO scoped_owner_id
    FROM "users"
    ORDER BY
        CASE WHEN "role" = 'admin' THEN 0 ELSE 1 END,
        "created_at" ASC,
        "id" ASC
    LIMIT 1;

    IF scoped_owner_id IS NULL THEN
        IF EXISTS (SELECT 1 FROM "boards") OR EXISTS (SELECT 1 FROM "settings") THEN
            RAISE EXCEPTION 'Cannot backfill owner scope without an existing user';
        END IF;

        RETURN;
    END IF;

    UPDATE "users"
    SET
        "attribute" = CASE
            WHEN "id" = scoped_owner_id THEN 'owner'
            ELSE 'shared'
        END,
        "owner_user_id" = CASE
            WHEN "id" = scoped_owner_id THEN NULL
            ELSE scoped_owner_id
        END,
        "role" = CASE
            WHEN "id" = scoped_owner_id THEN 'admin'
            ELSE "role"
        END,
        "phone_number" = CASE
            WHEN "id" = scoped_owner_id AND "phone_number" IS NULL THEN '000-0000-0000'
            ELSE "phone_number"
        END;

    UPDATE "boards"
    SET "owner_user_id" = scoped_owner_id
    WHERE "owner_user_id" IS NULL;

    UPDATE "settings"
    SET "owner_user_id" = scoped_owner_id
    WHERE "owner_user_id" IS NULL;
END
$$;--> statement-breakpoint
ALTER TABLE "boards" ALTER COLUMN "owner_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "owner_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" DROP CONSTRAINT IF EXISTS "settings_pkey";--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_owner_user_id_key_pk" PRIMARY KEY("owner_user_id","key");--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number");