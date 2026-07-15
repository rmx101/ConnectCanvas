import { startCanvas } from "@/app/actions";
import { Button } from "@/components/ui/button";

const landingNotes = [
  "A quiet place to begin",
  "Five simple reflections",
  "No scores or accounts",
];

export default function Home() {
  return (
    <main className="min-h-screen px-5 py-6 sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col justify-between rounded-[2rem] border bg-card/85 p-6 shadow-sm backdrop-blur sm:p-10">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold tracking-[0.28em] text-muted-foreground uppercase">
            Connect Canvas
          </p>
        </div>

        <div className="py-16 sm:py-24">
          <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-[-0.04em] text-balance sm:text-6xl">
            Make a little room for what feels true.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Begin with a few calm reflections and leave your perspective when it feels complete.
          </p>
          <form action={startCanvas} className="mt-8">
            <Button size="lg" type="submit" className="w-full sm:w-auto">Begin</Button>
          </form>
        </div>

        <ul className="grid gap-3 sm:grid-cols-3">
          {landingNotes.map((item) => (
            <li key={item} className="rounded-2xl border bg-background/70 p-4 text-sm font-medium text-foreground">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
