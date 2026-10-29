import Image from "next/image";
import Link from "next/link";
import { CalendarCheck, Check, ClipboardCopy, FilePlus2, Gauge, ListChecks, ShieldCheck } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { backendEnabled } from "@/lib/env";

export const metadata = { title: "A case diary for advocates", description: BRAND.tagline };

const START = backendEnabled ? "/login" : "/";

const STEPS = [
  { icon: FilePlus2, title: "Add a case once", body: "Type its CNR and the parties. That's the last time you enter it." },
  { icon: CalendarCheck, title: "Record each hearing", body: "What happened, the stage, the next date — or mark it disposed. A few taps." },
  { icon: ListChecks, title: "Open on today", body: "Today's hearings come first, with the calendar and cause lists a tap away." },
];

const FEATURES = [
  { icon: ShieldCheck, title: "Never lost", body: "Your cases live in your own account, synced across phone and laptop. Backup and restore never duplicates a case, even if you restore twice." },
  { icon: CalendarCheck, title: "Record a hearing in one step", body: "Set the next date or mark a case disposed, and the history writes itself." },
  { icon: ListChecks, title: "Today first, search on top", body: "No scrolling past last month to find this morning's matters." },
  { icon: ClipboardCopy, title: "Copy any case", body: "Title, number, CNR, court, next date — copied in one tap, ready for a note or a message." },
  { icon: Gauge, title: "Loads from your diary", body: "It reads your own records, not a live court query, so it opens straight away. Always confirm dates against the court's own record." },
];

const ALSO = ["Search by party, advocate, case number, FIR or Act", "Cause list and day list for a court or a whole complex", "Calendar of your hearings", "Order and judgment PDFs on the case", "Hearing reminder emails"];

const FAQ = [
  ["Does it fetch my cases from court websites?", `No. ${BRAND.name} is your diary: you add each case once and record what happens at each hearing. We don't pull data from court systems, so always confirm a date against the court's own record.`],
  ["Can I bring cases from the app I use now?", "If it exports a file, write to us and we'll help you bring it in. Otherwise, add each case by its CNR — it takes a few seconds."],
  ["What happens if I stop paying?", "You keep every case and can export them at any time. Adding more than 20 cases needs the Advocate plan."],
  ["Who can see my cases?", "Only you. They're stored in your account, and the privacy policy lists every company that helps us run the service."],
  ["Is this an official court app?", `No. ${BRAND.name} is independent and not affiliated with any court or government body.`],
];

function CTA({ children = "Start free" }: { children?: React.ReactNode }) {
  return (
    <Link href={START} className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-6 text-base font-semibold text-on-accent hover:brightness-110">
      {children}
    </Link>
  );
}

export default function WelcomePage() {
  return (
    <div className="bg-bg">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="flex items-center gap-2 text-lg font-bold text-text">
          <Image src="/icon.svg" alt="" width={28} height={28} unoptimized />
          {BRAND.name}
        </span>
        <nav aria-label="Site" className="flex items-center gap-4 text-sm font-semibold">
          <a href="#pricing" className="text-text-muted hover:text-text">Pricing</a>
          <Link href={START} className="text-accent hover:underline">Sign in</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-12 md:grid-cols-[1fr_auto] md:py-20">
          <div className="flex flex-col gap-5">
            <h1 className="text-xl text-text md:text-display">Your case diary, kept safe.</h1>
            <p className="max-w-xl text-lg font-normal text-text-muted">
              {BRAND.name} keeps every case in your own account — synced across phone and laptop — so an app update or a new
              phone never wipes your diary.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <CTA />
              <a href="#pricing" className="text-sm font-semibold text-accent hover:underline">See pricing</a>
            </div>
            <p className="text-sm text-text-muted">Free for up to 20 cases. No card needed.</p>
          </div>
          <Image
            src="/screens/today.png"
            alt={`The ${BRAND.name} home screen: a CNR lookup box, shortcuts, and today's hearings.`}
            width={390}
            height={844}
            priority
            className="mx-auto w-64 rounded-lg border border-border shadow-pop md:w-72"
          />
        </section>

        <section aria-labelledby="problem-h" className="bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <h2 id="problem-h" className="mb-6 text-xl text-text">The diary you rely on shouldn&rsquo;t be the thing you worry about</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-lg bg-surface-raised p-6 shadow-card">
                <h3 className="mb-2 text-lg text-text">Diaries vanish</h3>
                <p className="text-text-muted">Update the app, change phones, reinstall — and the cases you saved are gone, or the restore fails halfway.</p>
              </div>
              <div className="rounded-lg bg-surface-raised p-6 shadow-card">
                <h3 className="mb-2 text-lg text-text">It stalls when you need it</h3>
                <p className="text-text-muted">Searching, opening the calendar or loading today&rsquo;s list hangs — usually outside the courtroom, a minute before your matter.</p>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="how-h" className="mx-auto max-w-5xl px-4 py-14">
          <h2 id="how-h" className="mb-8 text-xl text-text">How it works</h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="flex flex-col gap-2">
                <span className="flex items-center gap-3 text-sm font-semibold text-accent">
                  <span className="flex h-8 w-8 items-center justify-center rounded-pill bg-accent-subtle">{i + 1}</span>
                  <Icon aria-hidden="true" size={20} />
                </span>
                <h3 className="text-lg text-text">{title}</h3>
                <p className="text-text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="features-h" className="bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <h2 id="features-h" className="mb-8 text-xl text-text">Built around what goes wrong</h2>
            <ul className="grid gap-6 md:grid-cols-2">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-4 rounded-lg bg-surface-raised p-6 shadow-card">
                  <Icon aria-hidden="true" size={24} className="shrink-0 text-accent" />
                  <div>
                    <h3 className="mb-1 text-lg text-text">{title}</h3>
                    <p className="text-text-muted">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <h3 className="mb-3 mt-10 text-base font-semibold text-text">And everything you&rsquo;d expect</h3>
            <ul className="grid gap-2 text-text-muted md:grid-cols-2">
              {ALSO.map((a) => (
                <li key={a} className="flex items-start gap-2">
                  <Check aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-success" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="pricing" aria-labelledby="pricing-h" className="mx-auto max-w-5xl scroll-mt-4 px-4 py-14">
          <h2 id="pricing-h" className="mb-8 text-xl text-text">Pricing</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-lg border border-border p-6">
              <h3 className="text-lg text-text">Free</h3>
              <p className="text-text-muted">For trying it on your own matters.</p>
              <p className="text-xl text-text">₹0</p>
              <ul className="flex flex-col gap-2 text-sm text-text">
                {["Up to 20 cases, synced and safe", "Record hearings, calendar, cause lists", "Backup, restore and copy", "Reminder emails", "10 order PDFs"].map((f) => (
                  <li key={f} className="flex gap-2"><Check aria-hidden="true" size={18} className="shrink-0 text-success" />{f}</li>
                ))}
              </ul>
              <div className="mt-auto"><CTA /></div>
            </div>
            <div className="flex flex-col gap-4 rounded-lg border-2 border-accent p-6">
              <h3 className="text-lg text-text">Advocate</h3>
              <p className="text-text-muted">For a full practice.</p>
              <p className="text-xl text-text">
                ₹149<span className="text-base font-normal text-text-muted">/month</span>
              </p>
              <p className="-mt-3 text-sm text-text-muted">or ₹1,490 a year — two months free</p>
              <ul className="flex flex-col gap-2 text-sm text-text">
                {["Unlimited cases", "Everything in Free", "Unlimited order PDFs (10 MB each)", "Cancel in one click, any time"].map((f) => (
                  <li key={f} className="flex gap-2"><Check aria-hidden="true" size={18} className="shrink-0 text-success" />{f}</li>
                ))}
              </ul>
              <div className="mt-auto"><CTA>Start free, upgrade later</CTA></div>
            </div>
          </div>
        </section>

        <section aria-labelledby="faq-h" className="bg-surface">
          <div className="mx-auto max-w-3xl px-4 py-14">
            <h2 id="faq-h" className="mb-6 text-xl text-text">Questions</h2>
            <div className="flex flex-col gap-3">
              {FAQ.map(([q, a]) => (
                <details key={q} className="rounded-lg bg-surface-raised p-5 shadow-card">
                  <summary className="cursor-pointer font-semibold text-text">{q}</summary>
                  <p className="mt-2 text-text-muted">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-16 text-center">
          <h2 className="text-xl text-text">Start with your next hearing.</h2>
          <CTA />
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-text-muted">
          <span>{BRAND.name} is independent and not affiliated with any court or government body.</span>
          <span className="flex gap-4">
            <Link href="/privacy" className="hover:text-text">Privacy</Link>
            <Link href="/terms" className="hover:text-text">Terms</Link>
            <a href={`mailto:${BRAND.supportEmail}`} className="hover:text-text">Contact</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
