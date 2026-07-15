CREATE TABLE "canvases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "public_token" varchar(48) NOT NULL,
  "status" text DEFAULT 'new' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "canvases_public_token_unique" UNIQUE("public_token")
);
