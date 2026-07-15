import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import { cookies } from "next/headers";

import { startCanvas } from "@/app/actions";
import { hashToken, ownerSessionCookieName } from "@/lib/tokens";
import { CopyInvitationLink } from "@/app/c/[publicToken]/copy-invitation-link";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { canvasOwners, canvases, participants } from "@/db/schema";

function statusText(total: number, completed: number) {
  if (completed >= 2) return "Ready to open";
  if (total >= 2 && completed < 2) return "Another perspective is in progress";
  return "Waiting for another perspective";
}

function completedText(completed: number) {
  if (completed === 0) return "No completed perspectives yet";
  if (completed === 1) return "One completed perspective";
  return "Two completed perspectives";
}

function formatDate(date: Date | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default async function MyPage() {
  const ownerToken = (await cookies()).get(ownerSessionCookieName)?.value;
  const ownerSessionHash = ownerToken ? hashToken(ownerToken) : null;
  const rows = ownerSessionHash ? await db.select({ publicToken: canvases.publicToken, createdAt: canvases.createdAt, lastViewedAt: canvases.lastViewedAt, total: sql<number>`count(${participants.id})::int`, completed: sql<number>`count(${participants.completedAt})::int` }).from(canvasOwners).innerJoin(canvases, eq(canvasOwners.canvasId, canvases.id)).leftJoin(participants, eq(participants.canvasId, canvases.id)).where(eq(canvasOwners.ownerSessionHash, ownerSessionHash)).groupBy(canvases.id).orderBy(sql`${canvases.createdAt} desc`) : [];

  return <main className="min-h-screen px-5 py-6 sm:px-8"><section className="mx-auto min-h-[calc(100vh-3rem)] w-full max-w-4xl rounded-[2rem] border bg-card/85 p-6 shadow-sm backdrop-blur sm:p-10"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold tracking-[0.28em] text-muted-foreground uppercase">Connect Canvas</p><h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Your canvases</h1></div><form action={startCanvas}><Button type="submit">Start a new canvas</Button></form></div>{rows.length === 0 ? <div className="mt-16 rounded-3xl border bg-background/70 p-8"><h2 className="text-2xl font-semibold">Nothing to find yet.</h2><p className="mt-3 text-muted-foreground">Begin a canvas and this browser will remember it for you.</p><form action={startCanvas} className="mt-6"><Button type="submit" size="lg">Begin</Button></form></div> : <div className="mt-10 grid gap-4">{rows.map((canvas) => <article key={canvas.publicToken} className="rounded-3xl border bg-background/70 p-5"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-2xl font-semibold">{statusText(canvas.total, canvas.completed)}</h2><p className="mt-2 text-muted-foreground">{completedText(canvas.completed)}</p><dl className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2"><div><dt className="font-medium text-foreground">Created</dt><dd>{formatDate(canvas.createdAt)}</dd></div>{canvas.lastViewedAt ? <div><dt className="font-medium text-foreground">Last viewed</dt><dd>{formatDate(canvas.lastViewedAt)}</dd></div> : null}</dl></div><div className="flex flex-col gap-3 sm:items-end"><Link href={`/c/${canvas.publicToken}`}><Button type="button" className="w-full sm:w-auto">Open</Button></Link><CopyInvitationLink publicToken={canvas.publicToken} label="Copy invitation" /></div></div></article>)}</div>}</section></main>;
}
