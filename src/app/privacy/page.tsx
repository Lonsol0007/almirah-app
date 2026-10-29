import { LegalPage } from "@/components/legal-page";
import { BRAND } from "@/lib/brand";

export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="28 October 2026">
      <p>
        {BRAND.name} helps advocates keep track of their own cases. This page says what we keep, why, who helps us run the
        service, and how to delete it all.
      </p>

      <h2>What we keep</h2>
      <ul>
        <li>Your email address and, if you add them, your name and bar registration number.</li>
        <li>The cases you add or restore: case numbers, CNRs, parties, advocates, dates and notes about hearings.</li>
        <li>Order and judgment PDFs you attach.</li>
        <li>Your plan and billing status. Card details go straight to Stripe; we never see or store them.</li>
      </ul>
      <p>
        Case records can contain other people&rsquo;s names. You add them as part of your professional work, and you
        decide what goes in. We don&rsquo;t pull anything from court systems and we don&rsquo;t share your cases with
        anyone.
      </p>

      <h2>Why</h2>
      <ul>
        <li>To show you your cases, your calendar and your cause lists.</li>
        <li>To email hearing reminders you&rsquo;ve switched on.</li>
        <li>To bill you if you choose a paid plan.</li>
      </ul>
      <p>No advertising, no selling data, no tracking across other sites.</p>

      <h2>Who processes data for us</h2>
      <ul>
        <li>Supabase — database, sign-in and file storage.</li>
        <li>Vercel — hosting the app.</li>
        <li>Stripe — payments and invoices.</li>
        <li>Resend — sending reminder and account emails.</li>
      </ul>

      <h2>Keeping and deleting</h2>
      <p>
        We keep your data while your account is open. Delete your account from Account and plan and everything — cases,
        attached files, profile — is deleted straight away; encrypted backups held by our database host roll off within
        their retention window. You can download a full backup of your cases at any time first.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to see, correct or delete your personal data, and raise a grievance, under India&rsquo;s Digital
        Personal Data Protection Act, 2023. Write to <a className="text-accent underline" href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>;
        we reply within 30 days.
      </p>
    </LegalPage>
  );
}
