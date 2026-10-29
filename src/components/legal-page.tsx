import type { ReactNode } from "react";
import { AppBar } from "./app-bar";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <AppBar title={title} backHref="/more" />
      <main className="mx-auto flex w-full max-w-[var(--content-max)] flex-col gap-4 px-4 py-6 text-sm leading-6 text-text [&_h2]:mt-4 [&_h2]:text-lg [&_li]:ml-5 [&_li]:list-disc">
        <p className="text-text-muted">Last updated {updated}</p>
        {children}
      </main>
    </>
  );
}
