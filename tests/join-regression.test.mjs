import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const actions = await readFile(new URL("../app/actions.ts", import.meta.url), "utf8");
const normalPage = await readFile(new URL("../app/c/[publicToken]/page.tsx", import.meta.url), "utf8");
const joinPage = await readFile(new URL("../app/c/[publicToken]/join/page.tsx", import.meta.url), "utf8");
const copyInvitationLink = await readFile(
  new URL("../app/c/[publicToken]/copy-invitation-link.tsx", import.meta.url),
  "utf8",
);
const migration = await readFile(new URL("../db/migrations/0002_even_meggan.sql", import.meta.url), "utf8");

test("normal canvas creation restores an existing owner participant session", () => {
  assert.match(actions, /restoreExisting && existingToken/);
  assert.match(actions, /redirect\(`\/c\/\$\{publicToken\}`\)/);
  assert.match(normalPage, /privateSessionTokenHash/);
});

test("dedicated join route can create a distinct participant in the same browser", () => {
  assert.match(actions, /createJoinParticipant/);
  assert.match(actions, /restoreExisting: false/);
  assert.doesNotMatch(joinPage, /cookies\(/);
  assert.match(joinPage, /createJoinParticipant\.bind\(null, publicToken\)/);
});

test("slot reservation tries slot 1 then slot 2 atomically", () => {
  assert.match(actions, /for \(const slot of \[1, 2\] as const\)/);
  assert.match(actions, /\.onConflictDoNothing\(\{ target: \[participants\.canvasId, participants\.slot\] \}\)/);
  assert.match(actions, /return null/);
});

test("third join is rejected as full", () => {
  assert.match(actions, /error=full/);
  assert.match(joinPage, /participantCount >= 2/);
});

test("public join invitation views do not update owner last_viewed_at", () => {
  assert.match(normalPage, /lastViewedAt: new Date\(\)/);
  assert.doesNotMatch(joinPage, /lastViewedAt/);
});

test("invitation copy uses the canonical public join URL instead of preview URLs", () => {
  assert.match(copyInvitationLink, /process\.env\.NEXT_PUBLIC_APP_URL/);
  assert.match(copyInvitationLink, /\/c\/\$\{publicToken\}\/join/);
  assert.match(copyInvitationLink, /navigator\.clipboard\.writeText\(invitationLink\)/);
  assert.doesNotMatch(copyInvitationLink, /writeText\(window\.location/);
  assert.doesNotMatch(copyInvitationLink, /window\.location\.href/);
});

test("migration keeps slot constraints and avoids destructive operations", () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "slot" integer/);
  assert.match(migration, /row_number\(\) OVER \(PARTITION BY "canvas_id"/);
  assert.match(migration, /CHECK \("slot" in \(1, 2\)\)/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS "participants_canvas_slot_idx"/);
  assert.doesNotMatch(migration, /DROP\s+/i);
});
