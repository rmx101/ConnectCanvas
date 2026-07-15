import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { createParticipant, startCanvas, touchCanvas } from "@/app/actions";
import { CopyInvitationLink } from "@/app/c/[publicToken]/copy-invitation-link";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { canvases, participants } from "@/db/schema";

type Props = { params: Promise<{ publicToken: string }>; searchParams: Promise<{ error?: string }> };

function errorMessage(error?: string) {
  if (error === "name") return "Enter a name with 80 characters or fewer.";
  if (error === "response") return "Add a response with 1,200 characters or fewer.";
  if (error === "full") return "This canvas already has two perspectives.";
  if (error === "reflection") return "That reflection could not be saved. Try the current prompt again.";
  return null;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen px-5 py-6 sm:px-8"><section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col justify-center rounded-[2rem] border bg-card/85 p-6 shadow-sm backdrop-blur sm:p-10">{children}</section></main>;
}

function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6 text-destructive">{message}</p>;
}

function NameEntry({ publicToken, message }: { publicToken: string; message: string | null }) {
  return <Shell><p className="text-sm font-semibold tracking-[0.28em] text-muted-foreground uppercase">Connect Canvas</p><h1 className="mt-5 text-4xl leading-tight font-semibold tracking-[-0.04em] text-balance sm:text-5xl">What should we call you?</h1><form action={createParticipant.bind(null, publicToken)} className="mt-8 space-y-5"><label className="block"><span className="sr-only">Display name</span><input name="displayName" maxLength={80} required autoComplete="name" className="w-full rounded-2xl border bg-background/80 px-4 py-4 text-base outline-none transition focus:ring-2 focus:ring-ring" placeholder="Your name" /></label><div className="flex flex-col gap-3 sm:flex-row"><Button type="submit" size="lg" className="w-full sm:w-auto">Continue</Button><CopyInvitationLink publicToken={publicToken} label="Invite someone now" /></div></form><ErrorNote message={message} /></Shell>;
}

export default async function JoinPage({ params, searchParams }: Props) {
  const { publicToken } = await params;
  const message = errorMessage((await searchParams).error);
  const [canvas] = await db.select({ id: canvases.id }).from(canvases).where(eq(canvases.publicToken, publicToken)).limit(1);
  if (!canvas) notFound();
  await touchCanvas(publicToken);

  const allParticipants = await db.select({ id: participants.id }).from(participants).where(eq(participants.canvasId, canvas.id));
  if (allParticipants.length >= 2) {
    return <Shell><p className="text-sm font-semibold tracking-[0.28em] text-muted-foreground uppercase">Connect Canvas</p><h1 className="mt-5 text-4xl leading-tight font-semibold tracking-[-0.04em] text-balance sm:text-5xl">This canvas is full.</h1><p className="mt-6 text-base leading-7 text-muted-foreground">Both perspective spaces are already reserved.</p><form action={startCanvas} className="mt-8"><Button type="submit">Start a new canvas</Button></form></Shell>;
  }

  return <NameEntry publicToken={publicToken} message={message} />;
}
