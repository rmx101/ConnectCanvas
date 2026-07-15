import { count, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { createJoinParticipant, startCanvas } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { canvases, participants } from "@/db/schema";

type JoinCanvasPageProps = {
  params: Promise<{
    publicToken: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

function errorMessage(error?: string) {
  if (error === "name") {
    return "Enter a name with 80 characters or fewer.";
  }

  if (error === "full") {
    return "This canvas is already full.";
  }

  return null;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-5 py-6 sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col justify-center rounded-[2rem] border bg-card/85 p-6 shadow-sm backdrop-blur sm:p-10">
        {children}
      </section>
    </main>
  );
}

function ErrorNote({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <p className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6 text-destructive">
      {message}
    </p>
  );
}

export default async function JoinCanvasPage({ params, searchParams }: JoinCanvasPageProps) {
  const { publicToken } = await params;
  const { error } = await searchParams;
  const message = errorMessage(error);
  const [canvas] = await db
    .select({ id: canvases.id })
    .from(canvases)
    .where(eq(canvases.publicToken, publicToken))
    .limit(1);

  if (!canvas) {
    notFound();
  }

  const [{ value: participantCount }] = await db
    .select({ value: count() })
    .from(participants)
    .where(eq(participants.canvasId, canvas.id));

  if (participantCount >= 2) {
    return (
      <Shell>
        <p className="text-sm font-semibold tracking-[0.28em] text-muted-foreground uppercase">Connect Canvas</p>
        <h1 className="mt-5 text-4xl leading-tight font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
          This canvas is full.
        </h1>
        <p className="mt-6 text-base leading-7 text-muted-foreground">Start a fresh canvas whenever you are ready.</p>
        <form action={startCanvas} className="mt-8">
          <Button type="submit">Start another canvas</Button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="text-sm font-semibold tracking-[0.28em] text-muted-foreground uppercase">Connect Canvas</p>
      <h1 className="mt-5 text-4xl leading-tight font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
        What should we call you?
      </h1>
      <form action={createJoinParticipant.bind(null, publicToken)} className="mt-8 space-y-5">
        <label className="block">
          <span className="sr-only">Display name</span>
          <input
            name="displayName"
            maxLength={80}
            required
            autoComplete="name"
            className="w-full rounded-2xl border bg-background/80 px-4 py-4 text-base outline-none transition focus:ring-2 focus:ring-ring"
            placeholder="Your name"
          />
        </label>
        <Button type="submit" size="lg" className="w-full sm:w-auto">
          Continue
        </Button>
      </form>
      <ErrorNote message={message} />
    </Shell>
  );
}
