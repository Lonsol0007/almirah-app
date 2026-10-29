import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { BRAND } from "@/lib/brand";
import { COLORS } from "@/lib/colors";
import { todayIST } from "@/lib/dates";
import { reminderEmail, type ReminderItem } from "@/lib/email/reminder";
import { SITE_URL, serverEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_ATTEMPTS = 3;

function authorised(req: NextRequest) {
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${serverEnv("CRON_SECRET")}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

// Daily at 02:30 UTC (08:00 IST) via Vercel Cron. Safe to run more than once a day: each case is claimed
// once per day through reminders(case_id, remind_at), and only unsent claims are emailed.
export async function GET(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const admin = supabaseAdmin();
  const resend = new Resend(serverEnv("RESEND_API_KEY"));
  const from = serverEnv("EMAIL_FROM");
  const today = todayIST();
  const remindAt = `${today}T03:30:00Z`; // 09:00 IST, the day's reminder slot

  const { data: due, error } = await admin.rpc("due_reminders", { on_day: today });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byUser = new Map<string, { email: string; rows: typeof due }>();
  for (const r of due ?? []) {
    const entry = byUser.get(r.user_id) ?? { email: r.email, rows: [] };
    entry.rows.push(r);
    byUser.set(r.user_id, entry);
  }

  const summary = { users: byUser.size, sent: 0, skipped: 0, failed: 0 };

  for (const [userId, { email, rows }] of byUser) {
    // Claim today's reminder for each case; existing claims are left alone.
    await admin
      .from("reminders")
      .upsert(rows.map((r: { case_id: string }) => ({ user_id: userId, case_id: r.case_id, remind_at: remindAt })), {
        onConflict: "case_id,remind_at",
        ignoreDuplicates: true,
      });
    const { data: open } = await admin
      .from("reminders")
      .select("id, case_id, attempts")
      .eq("user_id", userId)
      .eq("remind_at", remindAt)
      .is("sent_at", null)
      .lt("attempts", MAX_ATTEMPTS);
    if (!open?.length) {
      summary.skipped++;
      continue;
    }

    const items: ReminderItem[] = open.map((o) => {
      const r = rows.find((x: { case_id: string }) => x.case_id === o.case_id)!;
      const title = r.label || [r.case_type, r.registration_number].filter(Boolean).join(" ") || r.cnr;
      return { caseId: r.case_id, cnr: r.cnr, title, hearingDate: r.next_hearing_date };
    });
    const mail = reminderEmail({ brand: BRAND.name, siteUrl: SITE_URL, accent: COLORS.accent, items, today });
    const ids = open.map((o) => o.id);

    const res = await resend.emails.send(
      { from, to: email, subject: mail.subject, html: mail.html, text: mail.text },
      { idempotencyKey: `reminder-${userId}-${today}` },
    );

    if (res.error) {
      summary.failed++;
      for (const o of open) {
        await admin.from("reminders").update({ attempts: o.attempts + 1 }).eq("id", o.id);
      }
      if (open.some((o) => o.attempts + 1 >= MAX_ATTEMPTS)) {
        await admin.from("job_failures").insert({
          job: "reminders",
          payload: { user_id: userId, reminder_ids: ids, day: today },
          error: res.error.message,
        });
      }
      continue;
    }
    await admin.from("reminders").update({ sent_at: new Date().toISOString() }).in("id", ids);
    summary.sent++;
  }

  return NextResponse.json(summary);
}
