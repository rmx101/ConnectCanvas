CREATE TABLE "canvas_owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canvas_id" uuid NOT NULL,
	"owner_session_token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "canvas_owners" ADD CONSTRAINT "canvas_owners_canvas_id_canvases_id_fk" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "canvas_owners_canvas_id_idx" ON "canvas_owners" USING btree ("canvas_id");--> statement-breakpoint
CREATE UNIQUE INDEX "canvas_owners_owner_session_token_hash_idx" ON "canvas_owners" USING btree ("owner_session_token_hash");