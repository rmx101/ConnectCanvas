import Link from "next/link";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { startCanvas } from "@/app/actions";
import { hashToken, ownerSessionCookieName } from "@/lib/tokens";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { canvasOwners } from "@/db/schema";

const landingNotes = ["A quiet place to begin", "Five simple reflections", "No scores or accounts"];

export default async function Home() {
  const ownerToken = (await cookies()).get(ownerSessionCookieName)?.value;
  const owned = ownerToken ? await db.select({ id: canvasOwners.id }).from(canvasOwners).where(eq(canvasOwners.ownerSessionHash, hashToken(ownerToken))).limit(1) : [];
  return <main className="min-h-screen px-5 py-6 sm:px-8"><section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col justify-between rounded-[2rem] border bg-card/85 p-6 shadow-sm backdrop-blur sm:p-10"><p className="text-sm font-semibold tracking-[0.28em] text-muted-foreground uppercase">Connect Canvas</p><div className="py-16 sm:py-24"><h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-[-0.04em] text-balance sm:text-6xl">Make a little room for what feels true.</h1><p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Begin with a few calm reflections and leave your perspective when it feels complete.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row">{owned.length > 0 ? <Link href="/my"><Button size="lg" type="button" variant="secondary" className="w-full sm:w-auto">Continue to your canvases</Button></Link> : null}<form action={startCanvas}><Button size="lg" type="submit" className="w-full sm:w-auto">{owned.length > 0 ? "Begin a new canvas" : "Begin"}</Button></form></div></div><ul className="grid gap-3 sm:grid-cols-3">{landingNotes.map((item) => <li key={item} className="rounded-2xl border bg-background/70 p-4 text-sm font-medium text-foreground">{item}</li>)}</ul></section></main>;
}
