import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const normalPage = await readFile(new URL("../app/c/[publicToken]/page.tsx", import.meta.url), "utf8");
const sharedPage = await readFile(new URL("../app/canvas/[publicToken]/page.tsx", import.meta.url), "utf8");
const actions = await readFile(new URL("../app/actions.ts", import.meta.url), "utf8");
const readiness = await readFile(new URL("../lib/canvas-readiness.ts", import.meta.url), "utf8");
const myPage = await readFile(new URL("../app/my/page.tsx", import.meta.url), "utf8");
const joinPage = await readFile(new URL("../app/c/[publicToken]/join/page.tsx", import.meta.url), "utf8");

test("one completed participant remains on waiting screen with a check again action", () => {
  assert.match(normalPage, /if \(participant\.completedAt \|\| !nextReflection\)/);
  assert.match(normalPage, /if \(sharedState\.ready\) \{\s*redirect\(`\/canvas\/\$\{publicToken\}`\);\s*\}/);
  assert.match(normalPage, />Check again<\/Button>/);
  assert.match(normalPage, /Your perspective is here\./);
});

test("two completed participants are redirected to shared canvas after the final reflection", () => {
  assert.match(actions, /const sharedState = await getSharedCanvasState\(canvas\.id\);/);
  assert.match(actions, /if \(sharedState\.ready\) \{\s*redirect\(`\/canvas\/\$\{publicToken\}`\);\s*\}/);
});

test("owner can view shared canvas", () => {
  assert.match(sharedPage, /cookieStore\.get\(ownerCookieName\)/);
  assert.match(sharedPage, /from\(canvasOwners\)/);
  assert.match(sharedPage, /eq\(canvasOwners\.ownerSessionTokenHash, hashToken\(ownerToken\)\)/);
});

test("unrelated browser cannot view shared canvas", () => {
  assert.match(sharedPage, /if \(!participantAccess\[0\] && !ownerAccess\[0\]\) \{\s*notFound\(\);\s*\}/);
  assert.doesNotMatch(sharedPage, /publicToken[^\n]+responseText/);
});

test("all five responses for both participants render", () => {
  assert.match(sharedPage, /Your shared canvas/);
  assert.match(sharedPage, /Two perspectives, held side by side\./);
  assert.match(sharedPage, /reflections\.map/);
  assert.match(sharedPage, /\[participantOne, participantTwo\]\.map/);
  assert.match(sharedPage, /participant\.responses\[reflection\.id\]/);
});

test("incomplete response data does not mark the canvas ready", () => {
  assert.match(readiness, /participantsWithResponses\.length === 2/);
  assert.match(readiness, /participant\.completedAt/);
  assert.match(readiness, /reflections\.every\(\(reflection\) => typeof participant\.responses\[reflection\.id\] === "string"\)/);
});

test("dashboard ready card links to shared canvas", () => {
  assert.match(myPage, /return "Ready to open"/);
  assert.match(myPage, /canvas\.sharedState\.ready \? `\/canvas\/\$\{canvas\.publicToken\}` : `\/c\/\$\{canvas\.publicToken\}`/);
});

test("third participant remains blocked", () => {
  assert.match(joinPage, /participantCount >= 2/);
  assert.match(normalPage, /participantCount >= 2/);
  assert.match(actions, /\.onConflictDoNothing\(\{ target: \[participants\.canvasId, participants\.slot\] \}\)/);
});
