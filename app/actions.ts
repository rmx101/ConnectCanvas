"use server";

import { createHash, randomBytes } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ownerCookieName } from "@/lib/cookies";
import { db } from "@/db";
import { canvasOwners, canvases, participants, responses } from "@/db/schema";
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

function createOwnerToken() {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function participantCookieOptions(publicToken: string) {
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

async function reserveParticipantSlot(canvasId: string, displayName: string, privateTokenHash: string) {
  for (const slot of [1, 2] as const) {
    const [participant] = await db
      .insert(participants)
      .values({
        canvasId,
        displayName,
        privateSessionTokenHash: privateTokenHash,
        slot,
      })
      .onConflictDoNothing({ target: [participants.canvasId, participants.slot] })
      .returning({ id: participants.id });

    if (participant) {
      return participant;
    }
  }

  return null;
}

function ownerCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

async function createOwnedCanvas(ownerTokenHash: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const publicToken = createPublicToken();

    try {
      const canvas = await db.transaction(async (tx) => {
        const [createdCanvas] = await tx
          .insert(canvases)
          .values({ publicToken })
          .returning({ id: canvases.id, publicToken: canvases.publicToken });

        await tx.insert(canvasOwners).values({
          canvasId: createdCanvas.id,
          ownerSessionTokenHash: ownerTokenHash,
        });

        return createdCanvas;
      });

      return canvas;
    } catch (error) {
      if (isUniqueViolation(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to create a unique canvas invitation token.");
}

export async function startCanvas() {
  const cookieStore = await cookies();
  const existingOwnerToken = cookieStore.get(ownerCookieName)?.value;
  const ownerToken = existingOwnerToken ?? createOwnerToken();
  const canvas = await createOwnedCanvas(hashToken(ownerToken));

  if (!existingOwnerToken) {
    cookieStore.set(ownerCookieName, ownerToken, ownerCookieOptions());
  }

  redirect(`/c/${canvas.publicToken}`);
}

async function createParticipantForCanvas(publicToken: string, formData: FormData, options: { restoreExisting: boolean }) {
  const displayName = normalizeText(formData.get("displayName"), maxDisplayNameLength);

  if (!displayName) {
    redirect(`/c/${publicToken}${options.restoreExisting ? "" : "/join"}?error=name`);
  }

  const canvas = await findCanvas(publicToken);

  if (!canvas) {
    redirect("/");
  }

  const cookieStore = await cookies();
  const existingToken = cookieStore.get(participantCookieName)?.value;

  if (options.restoreExisting && existingToken) {
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

  const privateToken = createPrivateToken();
  const participant = await reserveParticipantSlot(canvas.id, displayName, hashToken(privateToken));

  if (!participant) {
    redirect(`/c/${publicToken}${options.restoreExisting ? "" : "/join"}?error=full`);
  }

  cookieStore.set(participantCookieName, privateToken, participantCookieOptions(publicToken));

  redirect(`/c/${publicToken}`);
}

export async function createParticipant(publicToken: string, formData: FormData) {
  await createParticipantForCanvas(publicToken, formData, { restoreExisting: true });
}

export async function createJoinParticipant(publicToken: string, formData: FormData) {
  await createParticipantForCanvas(publicToken, formData, { restoreExisting: false });
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
