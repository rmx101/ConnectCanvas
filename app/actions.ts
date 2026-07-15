"use server";

import { createHash, randomBytes } from "node:crypto";

import { and, count, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { canvases, participants, responses } from "@/db/schema";
import { isReflectionId, reflections } from "@/app/reflections";

const participantCookieName = "connect_canvas_participant";
const maxDisplayNameLength = 80;
const maxResponseLength = 1200;

function createPublicToken() {
  return randomBytes(16).toString("base64url");
}

function createPrivateToken() {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookieOptions(publicToken: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: `/c/${publicToken}`,
    maxAge: 60 * 60 * 24 * 30,
  };
}

function normalizeText(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed.length > maxLength) {
    return null;
  }

  return trimmed;
}

async function findCanvas(publicToken: string) {
  const [canvas] = await db
    .select({ id: canvases.id })
    .from(canvases)
    .where(eq(canvases.publicToken, publicToken))
    .limit(1);

  return canvas;
}

export async function startCanvas() {
  const publicToken = createPublicToken();

  await db.insert(canvases).values({ publicToken });

  redirect(`/c/${publicToken}`);
}

export async function createParticipant(publicToken: string, formData: FormData) {
  const displayName = normalizeText(formData.get("displayName"), maxDisplayNameLength);

  if (!displayName) {
    redirect(`/c/${publicToken}?error=name`);
  }

  const canvas = await findCanvas(publicToken);

  if (!canvas) {
    redirect("/");
  }

  const cookieStore = await cookies();
  const existingToken = cookieStore.get(participantCookieName)?.value;

  if (existingToken) {
    const [existingParticipant] = await db
      .select({ id: participants.id })
      .from(participants)
      .where(
        and(
          eq(participants.canvasId, canvas.id),
          eq(participants.privateSessionTokenHash, hashToken(existingToken)),
        ),
      )
      .limit(1);

    if (existingParticipant) {
      redirect(`/c/${publicToken}`);
    }
  }

  const [{ value: participantCount }] = await db
    .select({ value: count() })
    .from(participants)
    .where(eq(participants.canvasId, canvas.id));

  if (participantCount >= 2) {
    redirect(`/c/${publicToken}?error=full`);
  }

  const privateToken = createPrivateToken();

  await db.insert(participants).values({
    canvasId: canvas.id,
    displayName,
    privateSessionTokenHash: hashToken(privateToken),
  });

  cookieStore.set(participantCookieName, privateToken, cookieOptions(publicToken));

  redirect(`/c/${publicToken}`);
}

export async function saveReflection(publicToken: string, reflectionId: string, formData: FormData) {
  if (!isReflectionId(reflectionId)) {
    redirect(`/c/${publicToken}?error=reflection`);
  }

  const responseText = normalizeText(formData.get("responseText"), maxResponseLength);

  if (!responseText) {
    redirect(`/c/${publicToken}?error=response`);
  }

  const canvas = await findCanvas(publicToken);

  if (!canvas) {
    redirect("/");
  }

  const privateToken = (await cookies()).get(participantCookieName)?.value;

  if (!privateToken) {
    redirect(`/c/${publicToken}`);
  }

  const [participant] = await db
    .select({ id: participants.id, completedAt: participants.completedAt })
    .from(participants)
    .where(
      and(
        eq(participants.canvasId, canvas.id),
        eq(participants.privateSessionTokenHash, hashToken(privateToken)),
      ),
    )
    .limit(1);

  if (!participant || participant.completedAt) {
    redirect(`/c/${publicToken}`);
  }

  await db
    .insert(responses)
    .values({ participantId: participant.id, reflectionId, responseText })
    .onConflictDoNothing();

  const currentIndex = reflections.findIndex((reflection) => reflection.id === reflectionId);

  if (currentIndex === reflections.length - 1) {
    await db
      .update(participants)
      .set({ completedAt: new Date() })
      .where(and(eq(participants.id, participant.id), eq(participants.canvasId, canvas.id)));
  }

  redirect(`/c/${publicToken}`);
}
