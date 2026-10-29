"use client";

import { useState } from "react";
import { Bell, Inbox, RefreshCw, Trash2 } from "lucide-react";
import { AppBar } from "@/components/app-bar";
import { Accordion } from "@/components/ui/accordion";
import { StatusBadge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { CalendarGrid } from "@/components/ui/calendar-grid";
import { CaseCard } from "@/components/ui/case-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { DateField, Select, TextField } from "@/components/ui/field";
import { KeyValueList } from "@/components/ui/key-value";
import { SkeletonCard, Spinner } from "@/components/ui/spinner";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { todayIST } from "@/lib/dates";
import type { CourtCase } from "@/lib/types";

const sample: CourtCase = {
  id: "demo",
  cnr: "MHPU010012342024",
  caseType: "Civil Suit",
  registrationNumber: "112/2024",
  courtNo: "4",
  status: "pending",
  nextHearingDate: todayIST(),
  source: "seed",
  saved: true,
  parties: [
    { role: "petitioner", name: "R. Deshmukh" },
    { role: "respondent", name: "Municipal Corporation" },
  ],
  acts: [],
  history: [],
  orders: [],
  interimApps: [],
  transfers: [],
  updatedAt: new Date().toISOString(),
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignPage() {
  const [tab, setTab] = useState("number");
  const [dialog, setDialog] = useState(false);
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const [day, setDay] = useState<string>();
  const toast = useToast();

  return (
    <>
      <AppBar title="Design system" backHref="/" />
      <main className="mx-auto flex max-w-[var(--content-max)] flex-col gap-10 px-4 py-6 pb-24">
        <Block title="Buttons">
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <IconButton label="Refresh">
              <RefreshCw size={20} />
            </IconButton>
            <IconButton label="Delete" variant="subtle">
              <Trash2 size={20} />
            </IconButton>
          </div>
        </Block>

        <Block title="Fields">
          <TextField label="CNR number" placeholder="16 characters" hint="Printed on the first page of the case papers." />
          <TextField label="Case number" defaultValue="11x" error="Use digits only." />
          <Select
            label="District"
            placeholder="Choose a district"
            options={[
              { value: "pune", label: "Pune" },
              { value: "nagpur", label: "Nagpur" },
            ]}
          />
          <Select label="Court complex" placeholder="Choose a district first" options={[]} disabled />
          <DateField label="Date" defaultValue={todayIST()} />
        </Block>

        <Block title="Tabs">
          <Tabs
            label="Search by"
            value={tab}
            onChange={setTab}
            items={[
              { id: "number", label: "Case number" },
              { id: "party", label: "Party" },
              { id: "advocate", label: "Advocate" },
              { id: "fir", label: "FIR" },
            ]}
          >
            <p className="text-sm text-text-muted">Panel for “{tab}”.</p>
          </Tabs>
        </Block>

        <Block title="Badges">
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="pending">Next hearing · 12 Nov 2026</StatusBadge>
            <StatusBadge tone="today">Hearing today</StatusBadge>
            <StatusBadge tone="overdue">Date passed</StatusBadge>
            <StatusBadge tone="disposed">Disposed</StatusBadge>
          </div>
        </Block>

        <Block title="Case card">
          <CaseCard
            c={sample}
            actions={
              <IconButton label="Remove from My cases">
                <Trash2 size={20} />
              </IconButton>
            }
          />
          <SkeletonCard />
        </Block>

        <Block title="Accordion + key-value list">
          <div className="overflow-hidden rounded-lg border border-border">
            <Accordion title="Case details" defaultOpen>
              <KeyValueList
                items={[
                  { label: "Case type", value: "Civil Suit" },
                  { label: "Filing number", value: "4021/2024" },
                  { label: "Registration date", value: "" },
                ]}
              />
            </Accordion>
            <Accordion title="Orders" count={0}>
              <p className="text-sm text-text-muted">Nothing recorded.</p>
            </Accordion>
          </div>
        </Block>

        <Block title="Calendar">
          <CalendarGrid
            month={month}
            onMonthChange={setMonth}
            selected={day}
            onSelect={setDay}
            counts={{ [todayIST()]: 2 }}
          />
        </Block>

        <Block title="Empty state">
          <EmptyState
            icon={<Inbox size={40} />}
            title="No saved cases yet"
            body="Find a case and save it to keep an eye on its next date."
            action={<Button>Add a case</Button>}
          />
        </Block>

        <Block title="Feedback">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" icon={<Bell size={16} />} onClick={() => toast("Reminder set", "success")}>
              Toast
            </Button>
            <Button variant="danger" onClick={() => setDialog(true)}>
              Dialog
            </Button>
            <Spinner label="Loading" />
          </div>
          <ConfirmDialog
            open={dialog}
            title="Remove this case?"
            body="It disappears from My cases. You can add it again any time."
            confirmLabel="Remove"
            destructive
            onConfirm={() => setDialog(false)}
            onCancel={() => setDialog(false)}
          />
        </Block>
      </main>
    </>
  );
}
