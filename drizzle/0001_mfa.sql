CREATE TYPE "public"."credential_type" AS ENUM('totp', 'totp_pending', 'recovery');--> statement-breakpoint
CREATE TYPE "public"."session_stage" AS ENUM('full', 'mfa');--> statement-breakpoint
CREATE TABLE "credential" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"type" "credential_type" NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "stage" "session_stage" DEFAULT 'full' NOT NULL;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "mfa_failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "credential" ADD CONSTRAINT "credential_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credential_account_type_idx" ON "credential" USING btree ("account_id","type");