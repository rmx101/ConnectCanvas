-- If a legacy alpha canvas has more than two participant rows, this migration intentionally fails when setting participants.slot NOT NULL or creating the unique slot index. Resolve manually by choosing the two rows to keep/reslot before rerunning; production data is not dropped automatically.
CREATE TABLE "canvas_owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_session_hash" text NOT NULL,
	"canvas_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "canvases" ADD COLUMN "owner_token_hash" text;--> statement-breakpoint
UPDATE "canvases" SET "owner_token_hash" = encode(sha256(gen_random_uuid()::text::bytea), 'hex') WHERE "owner_token_hash" IS NULL;--> statement-breakpoint
ALTER TABLE "canvases" ALTER COLUMN "owner_token_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "canvases" ADD COLUMN "status" text DEFAULT 'waiting' NOT NULL;--> statement-breakpoint
ALTER TABLE "canvases" ADD COLUMN "last_viewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "canvases" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "slot" smallint;--> statement-breakpoint
WITH numbered AS (
  SELECT "id", row_number() OVER (PARTITION BY "canvas_id" ORDER BY "created_at", "id") AS rn
  FROM "participants"
)
UPDATE "participants"
SET "slot" = numbered.rn
FROM numbered
WHERE "participants"."id" = numbered."id" AND numbered.rn <= 2;--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "slot" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "canvas_owners" ADD CONSTRAINT "canvas_owners_canvas_id_canvases_id_fk" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "canvas_owners_owner_session_canvas_idx" ON "canvas_owners" USING btree ("owner_session_hash","canvas_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participants_canvas_slot_idx" ON "participants" USING btree ("canvas_id","slot");--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_slot_check" CHECK ("participants"."slot" in (1, 2));
