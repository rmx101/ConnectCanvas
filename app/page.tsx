import { startCanvas } from "@/app/actions";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen px-5 py-6 sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col justify-center rounded-[2rem] border bg-card/80 p-6 shadow-sm backdrop-blur sm:p-10">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold tracking-[0.28em] text-muted-foreground uppercase">
            Connect Canvas
          </p>
          <h1 className="text-4xl leading-tight font-semibold tracking-[-0.04em] text-balance sm:text-6xl">
            Start a shared canvas for better understanding.
          </h1>
          <p className="mt-6 text-base leading-7 text-muted-foreground sm:text-lg">
            Create a private canvas link you can keep or share. We will only ask for your name to begin.
          </p>
          <form action={startCanvas} className="mt-8">
            <Button size="lg" type="submit">
              Start a canvas
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
