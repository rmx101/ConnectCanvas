import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const actions = await readFile(new URL("../app/actions.ts", import.meta.url), "utf8");
const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
const migration = await readFile(new URL("../db/migrations/0003_add_canvas_owners.sql", import.meta.url), "utf8");
const myPage = await readFile(new URL("../app/my/page.tsx", import.meta.url), "utf8");
const landingPage = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const copyInvitation = await readFile(new URL("../app/c/[publicToken]/copy-invitation-link.tsx", import.meta.url), "utf8");
const cookieConstants = await readFile(new URL("../lib/cookies.ts", import.meta.url), "utf8");

test("same browser owner session is reused for multiple created canvases", () => {
  assert.match(cookieConstants, /ownerCookieName = "connect_canvas_owner"/);
  assert.match(actions, /existingOwnerToken \?\? createOwnerToken\(\)/);
  assert.match(actions, /if \(!existingOwnerToken\)/);
  assert.match(actions, /cookieStore\.set\(ownerCookieName, ownerToken, ownerCookieOptions\(\)\)/);
  assert.match(actions, /hashToken\(ownerToken\)/);
});

test("canvas and owner association avoid Neon HTTP transactions with public token retry", () => {
  assert.doesNotMatch(actions, /db\.transaction/);
  assert.match(actions, /db\s*\.insert\(canvases\)/);
  assert.match(actions, /db\.insert\(canvasOwners\)/);
  assert.match(actions, /for \(let attempt = 0; attempt < 5; attempt \+= 1\)/);
  assert.match(actions, /isUniqueViolation\(error\)/);
});

test("owner insert failure cleans up the created canvas and rethrows", () => {
  assert.match(actions, /await db\.delete\(canvases\)\.where\(eq\(canvases\.id, canvas\.id\)\)/);
  assert.match(actions, /catch \(error\) \{[\s\S]*throw error;[\s\S]*\}/);
});

test("one owner session hash can own multiple canvases", () => {
  assert.match(schema, /uniqueIndex\("canvas_owners_canvas_id_idx"\)\.on\(table\.canvasId\)/);
  assert.match(schema, /index\("canvas_owners_owner_session_token_hash_idx"\)\.on\(table\.ownerSessionTokenHash\)/);
  assert.doesNotMatch(schema, /uniqueIndex\("canvas_owners_owner_session_token_hash_idx"/);
  assert.match(migration, /DROP INDEX IF EXISTS "canvas_owners_owner_session_token_hash_unique"/);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS "canvas_owners_owner_session_token_hash_idx"/);
  assert.doesNotMatch(migration, /CREATE UNIQUE INDEX IF NOT EXISTS "canvas_owners_owner_session_token_hash_idx"/);
});

test("dashboard only shows canvases for the hashed owner cookie and can show both A and B", () => {
  assert.match(myPage, /cookies\(\)\)\.get\(ownerCookieName\)/);
  assert.match(myPage, /hashToken\(ownerToken\)/);
  assert.match(myPage, /where\(eq\(canvasOwners\.ownerSessionTokenHash, ownerHash\)\)/);
  assert.match(myPage, /cards\.map/);
});

test("dashboard status changes as participants start and finish", () => {
  assert.match(myPage, /Waiting for another perspective/);
  assert.match(myPage, /Another perspective is in progress/);
  assert.match(myPage, /Ready to open/);
  assert.match(myPage, /One perspective complete/);
  assert.match(myPage, /Two/);
  assert.match(myPage, /completedAt/);
});

test("dashboard presents user-facing actions without raw invitation URLs or invite navigation", () => {
  assert.match(myPage, />Open</);
  assert.match(myPage, /CopyInvitationLink/);
  assert.match(myPage, /Copy invitation/);
  assert.doesNotMatch(myPage, /Invite view/);
  assert.match(copyInvitation, /publicToken \? `\$\{window\.location\.origin\}\/c\/\$\{publicToken\}\/join` : window\.location\.href/);
});

test("landing page verifies an owned canvas before showing Continue", () => {
  assert.match(landingPage, /hasOwnedCanvas/);
  assert.match(landingPage, /from\(canvasOwners\)/);
  assert.match(landingPage, /where\(eq\(canvasOwners\.ownerSessionTokenHash, hashToken\(ownerToken\)\)\)/);
  assert.match(landingPage, /showContinue \?/);
});
