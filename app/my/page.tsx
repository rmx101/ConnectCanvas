import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";
import Link from "next/link";
import { cookies } from "next/headers";

import { startCanvas } from "@/app/actions";
import { ownerCookieName } from "@/app/session";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { canvasOwners, canvases } from "@/db/schema";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function invitationUrl(publicToken: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return appUrl ? `${appUrl}/c/${publicToken}/join` : `/c/${publicToken}/join`;
}

export default async function MyDashboardPage() {
  const ownerToken = (await cookies()).get(ownerCookieName)?.value;
  const ownedCanvases = ownerToken
    ? await db
        .select({ publicToken: canvases.publicToken, createdAt: canvases.createdAt, lastViewedAt: canvases.lastViewedAt })
        .from(canvasOwners)
        .innerJoin(canvases, eq(canvasOwners.canvasId, canvases.id))
        .where(eq(canvasOwners.ownerSessionTokenHash, hashToken(ownerToken)))
    : [];

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col rounded-[2rem] border bg-card/85 p-6 shadow-sm backdrop-blur sm:p-10">
        <p className="text-sm font-semibold tracking-[0.28em] text-muted-foreground uppercase">Connect Canvas</p>
        <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-4xl leading-tight font-semibold tracking-[-0.04em] text-balance sm:text-5xl">My canvases</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Continue a canvas you started from this browser, or create a new one.</p>
          </div>
          <form action={startCanvas}>
            <Button type="submit">Start a new canvas</Button>
          </form>
        </div>

        {ownedCanvases.length === 0 ? (
          <div className="mt-10 rounded-2xl border bg-background/70 p-5">
            <p className="font-medium">No owner-session canvases yet.</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Start a canvas to save it here with an anonymous cookie.</p>
          </div>
        ) : (
          <ul className="mt-10 grid gap-4">
            {ownedCanvases.map((canvas) => (
              <li key={canvas.publicToken} className="rounded-2xl border bg-background/70 p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-medium">Canvas started {canvas.createdAt.toLocaleDateString()}</p>
                    <p className="mt-1 break-all text-sm text-muted-foreground">Invite: {invitationUrl(canvas.publicToken)}</p>
                  </div>
                  <div className="flex gap-3">
                    <Link href={`/c/${canvas.publicToken}`}><Button type="button" variant="secondary">Continue</Button></Link>
                    <Link href={`/c/${canvas.publicToken}/join`}><Button type="button">Invite view</Button></Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
