import { LegalPage } from "@/components/legal-page";
import { BRAND } from "@/lib/brand";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="28 October 2026">
      <h2>What {BRAND.name} is</h2>
      <p>
        A tool for organising your own caseload. It is independent and not affiliated with any court or government
        body. It does not fetch live data from court systems: what you see is what you, or a
        backup you restored, put in.
      </p>

      <h2>Check the official record</h2>
      <p>
        Hearing dates and orders can change at short notice. Always confirm against the court&rsquo;s official record
        before relying on a date. We aren&rsquo;t liable for a missed hearing or a wrong date entered in the app.
      </p>

      <h2>Your account and your data</h2>
      <p>
        You&rsquo;re responsible for what you add and for having the right to add it. Your cases are yours: export them
        whenever you like and delete your account at any time.
      </p>

      <h2>Paid plans</h2>
      <p>
        Paid plans renew until you cancel. Cancel in one click from Account and plan; you keep Pro until the end of the
        period you&rsquo;ve paid for. Prices include applicable taxes unless shown otherwise.
      </p>

      <h2>Fair use</h2>
      <p>Don&rsquo;t try to access other people&rsquo;s accounts, overload the service, or use it to break the law.</p>

      <h2>Contact</h2>
      <p>
        <a className="text-accent underline" href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>
      </p>
    </LegalPage>
  );
}
