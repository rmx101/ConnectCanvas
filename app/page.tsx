import { startCanvas } from "@/app/actions";
import { Button } from "@/components/ui/button";

const foundationItems = [
  "Next.js App Router",
  "TypeScript",
  "Tailwind CSS",
  "shadcn/ui primitives",
  "Drizzle + Neon ready",
];

export default function Home() {
  return (
    <main className="min-h-screen px-5 py-6 sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col justify-between rounded-[2rem] border bg-card/80 p-6 shadow-sm backdrop-blur sm:p-10">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold tracking-[0.28em] text-muted-foreground uppercase">
            Connect Canvas
          </p>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            Foundation
          </span>
        </div>

        <div className="py-14 sm:py-20">
          <p className="mb-4 text-sm font-medium text-primary">S1-001</p>
          <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-[-0.04em] text-balance sm:text-6xl">
            A calm, deployable foundation for the next Connect Canvas chapter.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            This App Router shell replaces the static placeholder and keeps the product ready for Vercel and Neon without starting the Discovery flow.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <form action={startCanvas}>
              <Button size="lg" type="submit">Start a canvas</Button>
            </form>
            <Button size="lg" variant="secondary">Business features intentionally deferred</Button>
          </div>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {foundationItems.map((item) => (
            <li key={item} className="rounded-2xl border bg-background/70 p-4 text-sm font-medium text-foreground">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
