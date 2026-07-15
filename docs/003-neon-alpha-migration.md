# Neon alpha one-time migration steps

Migration `db/migrations/0002_even_meggan.sql` is designed for the current alpha schema that already has `canvases`, `participants`, and `responses` from migrations 0000 and 0001. It does not drop data and does not use extension-dependent database functions.

Run the migration through Drizzle:

```sh
npm run db:migrate
```

If the existing Neon database must be repaired manually before Drizzle records the migration, use this exact SQL once:

```sql
ALTER TABLE "canvases" ADD COLUMN IF NOT EXISTS "last_viewed_at" timestamp with time zone;
ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "slot" integer;

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
  AND ranked_participants.reserved_slot <= 2;

ALTER TABLE "participants" ADD CONSTRAINT "participants_slot_check" CHECK ("slot" in (1, 2));
ALTER TABLE "participants" ALTER COLUMN "slot" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "participants_canvas_slot_idx" ON "participants" USING btree ("canvas_id","slot");
```

Before applying the `SET NOT NULL` statement, verify that no existing alpha canvas has more than two participants:

```sql
SELECT "canvas_id", count(*) AS participant_count
FROM "participants"
GROUP BY "canvas_id"
HAVING count(*) > 2;
```

If that query returns rows, do not delete data automatically. Decide which two participants should occupy slots 1 and 2, archive the extra participant data separately, and then rerun the backfill/update portion before adding the constraints.
