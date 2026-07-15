import { eq } from "drizzle-orm";

import { db } from "@/db";
import { canvases } from "@/db/schema";

type CanvasPageProps = {
  params: Promise<{
    publicToken: string;
  }>;
};

function NotFoundState() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-6 sm:px-8">
      <section className="w-full max-w-xl rounded-[2rem] border bg-card/80 p-8 text-center shadow-sm backdrop-blur">
        <p className="text-sm font-semibold tracking-[0.28em] text-muted-foreground uppercase">
          Connect Canvas
        </p>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em]">Canvas not found</h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          This link does not match an active canvas. Please check the URL or start a new canvas when you are ready.
        </p>
      </section>
    </main>
  );
}

export default async function CanvasPage({ params }: CanvasPageProps) {
  const { publicToken } = await params;
  const [canvas] = await db
    .select({ publicToken: canvases.publicToken, status: canvases.status })
    .from(canvases)
    .where(eq(canvases.publicToken, publicToken))
    .limit(1);

  if (!canvas) {
    return <NotFoundState />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-6 sm:px-8">
      <section className="w-full max-w-xl rounded-[2rem] border bg-card/80 p-8 shadow-sm backdrop-blur">
        <p className="text-sm font-semibold tracking-[0.28em] text-muted-foreground uppercase">
          Connect Canvas
        </p>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em]">What should we call you?</h1>
        <form className="mt-8">
          <label className="sr-only" htmlFor="display-name">
            What should we call you?
          </label>
          <input
            className="h-12 w-full rounded-md border bg-background px-4 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            id="display-name"
            name="displayName"
            placeholder="Your name"
            type="text"
          />
        </form>
      </section>
    </main>
  );
}
