import { createHash } from "node:crypto";

import { asc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import Link from "next/link";

import { startCanvas } from "@/app/actions";
import { ownerCookieName } from "@/lib/cookies";
import { CopyInvitationLink } from "@/app/c/[publicToken]/copy-invitation-link";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { canvasOwners, canvases } from "@/db/schema";
import { getSharedCanvasState, type ReadyParticipant } from "@/lib/canvas-readiness";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function formatDate(date: Date | null) {
  return date ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date) : null;
}

function statusText(sharedState: { ready: boolean; participants: ReadyParticipant[] }) {
  if (sharedState.ready) {
    return "Ready to open";
  }

  if (sharedState.participants.length < 2) {
    return "Waiting for another perspective";
  }

  return "Another perspective is in progress";
}

function participantCountText(rows: ReadyParticipant[]) {
  return `${Math.min(rows.length, 2)}/2`;
}

function completionText(rows: ReadyParticipant[]) {
  const completedCount = rows.filter((row) => row.completedAt).length;
  return completedCount === 1 ? "One perspective complete" : `${completedCount === 2 ? "Two" : "No"} perspectives complete`;
}

export default async function MyCanvasesPage() {
  const ownerToken = (await cookies()).get(ownerCookieName)?.value;
  const ownerHash = ownerToken ? hashToken(ownerToken) : null;
  const ownedCanvases = ownerHash
    ? await db
        .select({
          id: canvases.id,
          publicToken: canvases.publicToken,
          createdAt: canvases.createdAt,
          lastViewedAt: canvases.lastViewedAt,
        })
        .from(canvasOwners)
        .innerJoin(canvases, eq(canvasOwners.canvasId, canvases.id))
        .where(eq(canvasOwners.ownerSessionTokenHash, ownerHash))
        .orderBy(asc(canvases.createdAt))
    : [];
  const cards = await Promise.all(
    ownedCanvases.map(async (canvas) => ({
      ...canvas,
      sharedState: await getSharedCanvasState(canvas.id),
    })),
  );

  return (
    <main className="px-5 py-6 sm:px-8">
      <section className="mx-auto min-h-[calc(100vh-7rem)] w-full max-w-4xl rounded-[2rem] border bg-card/85 p-6 shadow-sm backdrop-blur sm:p-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-4xl leading-tight font-semibold tracking-[-0.04em] text-balance">Your canvases</h1>
          </div>
          <form action={startCanvas}>
            <Button type="submit" className="w-full sm:w-auto">Start Canvas</Button>
          </form>
        </div>

        {cards.length === 0 ? (
          <div className="mt-10 rounded-3xl border bg-background/70 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">No canvases yet</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Create your first canvas to begin sharing perspectives.
            </p>
            <form action={startCanvas} className="mt-6">
              <Button type="submit">Start Canvas</Button>
            </form>
          </div>
        ) : (
          <div className="mt-10 grid gap-4">
            {cards.map((canvas) => {
              const lastViewed = formatDate(canvas.lastViewedAt);
              return (
                <article key={canvas.id} className="rounded-3xl border bg-background/70 p-5">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold">{statusText(canvas.sharedState)}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{completionText(canvas.sharedState.participants)}</p>
                      <dl className="mt-4 space-y-1 text-sm text-muted-foreground">
                        <div><dt className="inline font-medium text-foreground">Created:</dt> <dd className="inline">{formatDate(canvas.createdAt)}</dd></div>
                        <div><dt className="inline font-medium text-foreground">Participants:</dt> <dd className="inline">{participantCountText(canvas.sharedState.participants)}</dd></div>
                        {lastViewed ? <div><dt className="inline font-medium text-foreground">Last viewed:</dt> <dd className="inline">{lastViewed}</dd></div> : null}
                      </dl>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto">
                      <Link href={canvas.sharedState.ready ? `/canvas/${canvas.publicToken}` : `/c/${canvas.publicToken}`} className="w-full sm:w-auto">
                        <Button type="button" className="w-full">Open</Button>
                      </Link>
                      <CopyInvitationLink publicToken={canvas.publicToken} label="Copy invitation" />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
