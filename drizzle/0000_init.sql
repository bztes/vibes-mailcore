CREATE TYPE "public"."domain_role" AS ENUM('owner', 'manager');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "alias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"local_part" text NOT NULL,
	"destinations" text[] NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"dkim_selector" text NOT NULL,
	"dkim_private_key" text NOT NULL,
	"dkim_public_key" text NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_manager" (
	"domain_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"role" "domain_role" DEFAULT 'manager' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domain_manager_domain_id_account_id_pk" PRIMARY KEY("domain_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "mailbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"local_part" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"password_hash" text NOT NULL,
	"quota_bytes" bigint NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alias" ADD CONSTRAINT "alias_domain_id_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_manager" ADD CONSTRAINT "domain_manager_domain_id_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_manager" ADD CONSTRAINT "domain_manager_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox" ADD CONSTRAINT "mailbox_domain_id_domain_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domain"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alias_address_idx" ON "alias" USING btree ("domain_id","local_part");--> statement-breakpoint
CREATE UNIQUE INDEX "domain_verified_name_idx" ON "domain" USING btree ("name") WHERE "domain"."verified_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "domain_manager_account_idx" ON "domain_manager" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mailbox_address_idx" ON "mailbox" USING btree ("domain_id","local_part");--> statement-breakpoint
CREATE INDEX "session_account_idx" ON "session" USING btree ("account_id");--> statement-breakpoint
CREATE VIEW "public"."mail_aliases" AS (
	SELECT a.local_part || '@' || d.name AS address,
	       array_to_string(a.destinations, ',') AS destinations
	FROM alias a
	JOIN domain d ON d.id = a.domain_id
	WHERE a.active AND d.active AND d.verified_at IS NOT NULL
	UNION ALL
	SELECT m.local_part || '@' || d.name, m.local_part || '@' || d.name
	FROM mailbox m
	JOIN domain d ON d.id = m.domain_id
	WHERE m.active AND d.active AND d.verified_at IS NOT NULL
);--> statement-breakpoint
CREATE VIEW "public"."mail_domains" AS (SELECT name AS domain FROM domain WHERE active AND verified_at IS NOT NULL);--> statement-breakpoint
CREATE VIEW "public"."mail_sender_logins" AS (
	SELECT address, string_agg(login, ',') AS logins
	FROM (
		SELECT m.local_part || '@' || d.name AS address, m.local_part || '@' || d.name AS login
		FROM mailbox m
		JOIN domain d ON d.id = m.domain_id
		WHERE m.active AND d.active AND d.verified_at IS NOT NULL
		UNION
		SELECT a.local_part || '@' || d.name, lower(dest)
		FROM alias a
		JOIN domain d ON d.id = a.domain_id
		CROSS JOIN LATERAL unnest(a.destinations) AS dest
		WHERE a.active AND d.active AND d.verified_at IS NOT NULL
	) s
	GROUP BY address
);--> statement-breakpoint
CREATE VIEW "public"."mail_users" AS (
	SELECT m.local_part || '@' || d.name AS address,
	       d.name AS domain,
	       m.local_part,
	       m.password_hash AS password,
	       m.quota_bytes
	FROM mailbox m
	JOIN domain d ON d.id = m.domain_id
	WHERE m.active AND d.active AND d.verified_at IS NOT NULL
);--> statement-breakpoint
-- postfix + dovecot connect as `mailserver` (created by docker/postgres/init.sh)
-- and may only read these views.
GRANT SELECT ON mail_domains, mail_users, mail_aliases, mail_sender_logins TO mailserver;
