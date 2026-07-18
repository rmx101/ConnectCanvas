import { createHash } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { reflections } from "@/app/reflections";
import { db } from "@/db";
import { canvasOwners, canvases, participants } from "@/db/schema";
import { getSharedCanvasState } from "@/lib/canvas-readiness";
import { ownerCookieName, participantCookieName } from "@/lib/cookies";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

type SharedCanvasPageProps = {
  params: Promise<{
    publicToken: string;
  }>;
};

export default async function SharedCanvasPage({ params }: SharedCanvasPageProps) {
  const { publicToken } = await params;
  const [canvas] = await db
    .select({ id: canvases.id })
    .from(canvases)
    .where(eq(canvases.publicToken, publicToken))
    .limit(1);

  if (!canvas) {
    notFound();
  }

  const cookieStore = await cookies();
  const privateToken = cookieStore.get(participantCookieName(publicToken))?.value;
  const ownerToken = cookieStore.get(ownerCookieName)?.value;

  const participantAccess = privateToken
    ? await db
        .select({ id: participants.id })
        .from(participants)
        .where(
          and(
            eq(participants.canvasId, canvas.id),
            eq(participants.privateSessionTokenHash, hashToken(privateToken)),
          ),
        )
        .limit(1)
    : [];

  const ownerAccess = ownerToken
    ? await db
        .select({ id: canvasOwners.id })
        .from(canvasOwners)
        .where(
          and(
            eq(canvasOwners.canvasId, canvas.id),
            eq(canvasOwners.ownerSessionTokenHash, hashToken(ownerToken)),
          ),
        )
        .limit(1)
    : [];

  if (!participantAccess[0] && !ownerAccess[0]) {
    notFound();
  }

  const sharedState = await getSharedCanvasState(canvas.id);

  if (!sharedState.ready) {
    redirect(`/c/${publicToken}`);
  }

  await db.update(canvases).set({ lastViewedAt: new Date() }).where(eq(canvases.id, canvas.id));

  const [participantOne, participantTwo] = sharedState.participants;

  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mx-auto w-full max-w-6xl rounded-[2rem] border bg-card/85 p-6 shadow-sm backdrop-blur sm:p-10">
        <p className="text-sm font-semibold tracking-[0.28em] text-muted-foreground uppercase">Connect Canvas</p>
        <h1 className="mt-5 text-4xl leading-tight font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
          Your shared canvas
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          Two perspectives, held side by side.
        </p>

        <div className="mt-10 space-y-6">
          {reflections.map((reflection) => (
            <article key={reflection.id} className="rounded-3xl border bg-background/70 p-5 sm:p-6">
              <h2 className="text-2xl leading-snug font-semibold tracking-[-0.03em] text-balance">
                {reflection.prompt}
              </h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {[participantOne, participantTwo].map((participant) => (
                  <section key={participant.id} className="rounded-2xl border bg-card/80 p-5">
                    <h3 className="text-sm font-semibold text-muted-foreground">{participant.displayName}</h3>
                    <p className="mt-4 whitespace-pre-wrap text-base leading-7">{participant.responses[reflection.id]}</p>
                  </section>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
