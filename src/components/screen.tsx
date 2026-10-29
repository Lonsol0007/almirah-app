import type { ReactNode } from "react";
import { AppBar } from "./app-bar";
import { BottomNav } from "./bottom-nav";

export function Screen({
  title,
  backHref,
  actions,
  children,
}: {
  title: string;
  backHref?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <AppBar title={title} backHref={backHref} actions={actions} />
      <main
        className="mx-auto flex w-full max-w-[var(--content-max)] flex-col gap-5 px-4 py-5"
        style={{ paddingBottom: "calc(var(--bottom-nav-height) + 24px)" }}
      >
        {children}
      </main>
      <BottomNav />
    </>
  );
}
