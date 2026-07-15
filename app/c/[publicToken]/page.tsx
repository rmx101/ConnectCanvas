import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { canvases } from "@/db/schema";

type CanvasPageProps = {
  params: Promise<{
    publicToken: string;
  }>;
};

export default async function CanvasPage({ params }: CanvasPageProps) {
  const { publicToken } = await params;
  const [canvas] = await db
    .select({ id: canvases.id, publicToken: canvases.publicToken })
    .from(canvases)
    .where(eq(canvases.publicToken, publicToken))
    .limit(1);

  if (!canvas) {
    notFound();
  }

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col justify-center rounded-[2rem] border bg-card/80 p-6 shadow-sm backdrop-blur sm:p-10">
        <p className="mb-4 text-sm font-semibold tracking-[0.28em] text-muted-foreground uppercase">
          Connect Canvas
        </p>
        <h1 className="text-4xl leading-tight font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
          Your canvas is ready.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          This preview confirms the saved canvas loads from its public token.
        </p>
        <p className="mt-8 rounded-2xl border bg-background/70 p-4 font-mono text-sm break-all text-muted-foreground">
          {canvas.publicToken}
        </p>
      </section>
    </main>
  );
}
