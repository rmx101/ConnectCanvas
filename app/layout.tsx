import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Connect Canvas",
  description: "A mobile-first foundation for building shared understanding.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="px-5 pt-5 sm:px-8">
          <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 rounded-full border bg-card/75 px-5 py-3 text-sm shadow-sm backdrop-blur">
            <Link href="/" className="font-semibold tracking-[-0.02em] text-foreground transition hover:text-primary">
              Connect Canvas
            </Link>
            <Link href="/my" className="font-medium text-muted-foreground transition hover:text-foreground">
              My Canvases
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
