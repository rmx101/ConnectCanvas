CREATE TABLE IF NOT EXISTS "canvas_owners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "canvas_id" uuid NOT NULL,
  "owner_session_token_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "canvas_owners" ADD CONSTRAINT "canvas_owners_canvas_id_canvases_id_fk" FOREIGN KEY ("canvas_id") REFERENCES "canvases"("id") ON DELETE cascade;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DROP INDEX IF EXISTS "canvas_owners_owner_session_token_hash_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "canvas_owners_owner_session_token_hash_idx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "canvas_owners_canvas_id_idx" ON "canvas_owners" USING btree ("canvas_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "canvas_owners_owner_session_token_hash_idx" ON "canvas_owners" USING btree ("owner_session_token_hash");
