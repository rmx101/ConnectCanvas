import { eq, inArray } from "drizzle-orm";

import { reflections } from "@/app/reflections";
import { db } from "@/db";
import { participants, responses } from "@/db/schema";

export type ReadyParticipant = {
  id: string;
  displayName: string;
  slot: number;
  completedAt: Date | null;
  responses: Record<string, string>;
};

export type SharedCanvasState = {
  ready: boolean;
  participants: ReadyParticipant[];
};

export async function getSharedCanvasState(canvasId: string): Promise<SharedCanvasState> {
  const participantRows = await db
    .select({
      id: participants.id,
      displayName: participants.displayName,
      slot: participants.slot,
      completedAt: participants.completedAt,
    })
    .from(participants)
    .where(eq(participants.canvasId, canvasId));

  const participantIds = participantRows.map((participant) => participant.id);
  const responseRows = participantIds.length
    ? await db
        .select({
          participantId: responses.participantId,
          reflectionId: responses.reflectionId,
          responseText: responses.responseText,
        })
        .from(responses)
        .where(inArray(responses.participantId, participantIds))
    : [];

  const participantsWithResponses = participantRows
    .map((participant) => ({
      ...participant,
      responses: Object.fromEntries(
        responseRows
          .filter((response) => response.participantId === participant.id)
          .map((response) => [response.reflectionId, response.responseText]),
      ),
    }))
    .sort((first, second) => first.slot - second.slot);

  const ready =
    participantsWithResponses.length === 2 &&
    participantsWithResponses.every(
      (participant) =>
        participant.completedAt &&
        reflections.every((reflection) => typeof participant.responses[reflection.id] === "string"),
    );

  return { ready, participants: participantsWithResponses };
}
