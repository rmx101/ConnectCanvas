ALTER TABLE "canvases" ADD COLUMN IF NOT EXISTS "last_viewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "slot" integer;--> statement-breakpoint
WITH ranked_participants AS (
  SELECT
    "id",
    row_number() OVER (PARTITION BY "canvas_id" ORDER BY "created_at", "id") AS reserved_slot
  FROM "participants"
)
UPDATE "participants"
SET "slot" = ranked_participants.reserved_slot
FROM ranked_participants
WHERE "participants"."id" = ranked_participants."id"
  AND "participants"."slot" IS NULL
  AND ranked_participants.reserved_slot <= 2;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_slot_check" CHECK ("slot" in (1, 2));--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "slot" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "participants_canvas_slot_idx" ON "participants" USING btree ("canvas_id","slot");
