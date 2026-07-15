"use server";

import { randomBytes } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isReflectionId, reflections } from "@/app/reflections";
import { db } from "@/db";
import { canvasOwners, canvases, participants, responses } from "@/db/schema";
import { hashToken, ownerSessionCookieName, participantCookieName } from "@/lib/tokens";

const maxDisplayNameLength = 80;
const maxResponseLength = 1200;
const oneYear = 60 * 60 * 24 * 365;

function createPublicToken() {
  return randomBytes(8).toString("base64url").slice(0, 11);
}

function createPrivateToken() {
  return randomBytes(32).toString("base64url");
}

function cookieOptions(path = "/", maxAge = oneYear) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path,
    maxAge,
  };
}

function normalizeText(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return null;
  return trimmed;
}

async function findCanvas(publicToken: string) {
  const [canvas] = await db.select({ id: canvases.id }).from(canvases).where(eq(canvases.publicToken, publicToken)).limit(1);
  return canvas;
}

async function getOrCreateOwnerSessionHash() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(ownerSessionCookieName)?.value;
  if (existing) return hashToken(existing);
  const token = createPrivateToken();
  cookieStore.set(ownerSessionCookieName, token, cookieOptions());
  return hashToken(token);
}

async function createCanvasForOwner(ownerSessionHash: string) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const publicToken = createPublicToken();
    const ownerTokenHash = hashToken(createPrivateToken());
    const rows = await db.transaction(async (tx) => {
      const inserted = await tx.insert(canvases).values({ publicToken, ownerTokenHash }).onConflictDoNothing().returning({ id: canvases.id, publicToken: canvases.publicToken });
      if (!inserted[0]) return [];
      await tx.insert(canvasOwners).values({ canvasId: inserted[0].id, ownerSessionHash }).onConflictDoNothing();
      return inserted;
    });
    if (rows[0]) return rows[0].publicToken;
  }
  throw new Error("Could not create a unique canvas token.");
}

export async function startCanvas() {
  const ownerSessionHash = await getOrCreateOwnerSessionHash();
  const publicToken = await createCanvasForOwner(ownerSessionHash);
  redirect(`/c/${publicToken}`);
}

export async function createParticipant(publicToken: string, formData: FormData) {
  const displayName = normalizeText(formData.get("displayName"), maxDisplayNameLength);
  if (!displayName) redirect(`/c/${publicToken}?error=name`);
  const canvas = await findCanvas(publicToken);
  if (!canvas) redirect("/");

  const cookieStore = await cookies();
  const existingToken = cookieStore.get(participantCookieName)?.value;
  if (existingToken) {
    const [existingParticipant] = await db.select({ id: participants.id }).from(participants).where(and(eq(participants.canvasId, canvas.id), eq(participants.privateSessionTokenHash, hashToken(existingToken)))).limit(1);
    if (existingParticipant) redirect(`/c/${publicToken}`);
  }

  const privateToken = createPrivateToken();
  try {
    await db.transaction(async (tx) => {
      const taken = await tx.select({ slot: participants.slot }).from(participants).where(eq(participants.canvasId, canvas.id));
      const used = new Set(taken.map((row) => row.slot));
      const slot = !used.has(1) ? 1 : !used.has(2) ? 2 : null;
      if (!slot) throw new Error("full");
      await tx.insert(participants).values({ canvasId: canvas.id, slot, displayName, privateSessionTokenHash: hashToken(privateToken) });
      await tx.update(canvases).set({ status: "waiting", updatedAt: new Date() }).where(eq(canvases.id, canvas.id));
    });
  } catch {
    redirect(`/c/${publicToken}/join?error=full`);
  }

  cookieStore.set(participantCookieName, privateToken, cookieOptions(`/c/${publicToken}`));
  redirect(`/c/${publicToken}`);
}

export async function saveReflection(publicToken: string, reflectionId: string, formData: FormData) {
  if (!isReflectionId(reflectionId)) redirect(`/c/${publicToken}?error=reflection`);
  const responseText = normalizeText(formData.get("responseText"), maxResponseLength);
  if (!responseText) redirect(`/c/${publicToken}?error=response`);
  const canvas = await findCanvas(publicToken);
  if (!canvas) redirect("/");
  const privateToken = (await cookies()).get(participantCookieName)?.value;
  if (!privateToken) redirect(`/c/${publicToken}`);

  const [participant] = await db.select({ id: participants.id, completedAt: participants.completedAt }).from(participants).where(and(eq(participants.canvasId, canvas.id), eq(participants.privateSessionTokenHash, hashToken(privateToken)))).limit(1);
  if (!participant || participant.completedAt) redirect(`/c/${publicToken}`);

  await db.insert(responses).values({ participantId: participant.id, reflectionId, responseText }).onConflictDoNothing();
  const currentIndex = reflections.findIndex((reflection) => reflection.id === reflectionId);
  if (currentIndex === reflections.length - 1) {
    await db.transaction(async (tx) => {
      await tx.update(participants).set({ completedAt: new Date() }).where(and(eq(participants.id, participant.id), eq(participants.canvasId, canvas.id)));
      const completed = await tx.select({ id: participants.id }).from(participants).where(and(eq(participants.canvasId, canvas.id), sql`${participants.completedAt} is not null`));
      await tx.update(canvases).set({ status: completed.length >= 2 ? "ready" : "waiting", updatedAt: new Date() }).where(eq(canvases.id, canvas.id));
    });
  }
  redirect(`/c/${publicToken}`);
}

export async function touchCanvas(publicToken: string) {
  await db.update(canvases).set({ lastViewedAt: new Date(), updatedAt: new Date() }).where(eq(canvases.publicToken, publicToken));
}
