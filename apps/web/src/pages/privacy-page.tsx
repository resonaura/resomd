import { PageShell } from '@/components/page-shell';

export function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy" maxWidth="max-w-2xl">
      <div className="text-foreground/90 flex flex-col gap-6 text-sm leading-relaxed">
        <p className="text-muted-foreground">Last updated: June 2026</p>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">Who we are</h2>
          <p>
            ResoMD is a markdown editor. This policy explains what data we
            collect when you use it, and what we do — and don't do — with it.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">
            Using ResoMD without an account
          </h2>
          <p>
            By default, ResoMD works entirely in your browser. The document
            you're editing is kept in your browser's local storage and is never
            sent to our servers, except when you explicitly use a server-side
            feature (such as PDF export, which sends the rendered document to
            our server only long enough to generate the PDF — it is not stored
            afterwards).
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">
            What we collect with an account
          </h2>
          <p>If you create an account, we store:</p>
          <ul className="ml-5 list-disc">
            <li>Your email address.</li>
            <li>
              A salted, hashed version of your password (bcrypt, cost factor 12)
              — we never store or have access to your plaintext password.
            </li>
            <li>
              An optional display name and avatar URL, if you choose to set
              them.
            </li>
            <li>
              The documents and folders you save to your account, so they can
              sync across devices.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">
            Sessions and local storage
          </h2>
          <p>
            After signing in, we store a signed authentication token (JWT) in
            your browser's local storage, valid for up to 90 days. This token
            identifies your account on requests to our API; it does not contain
            your password.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">
            What we don't do
          </h2>
          <ul className="ml-5 list-disc">
            <li>We don't run ads or third-party trackers.</li>
            <li>We don't sell or share your data with third parties.</li>
            <li>
              We don't track anonymous usage analytics tied to your identity.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">
            Data retention and deletion
          </h2>
          <p>
            Your account data and documents are kept for as long as your account
            exists. Deleting your account (from the Account page) permanently
            and immediately removes your user record along with every document
            and folder you own. This cannot be undone.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">Your rights</h2>
          <p>
            You can view and update your profile information at any time from
            the Account page, and export your documents as markdown files
            whenever you like. You can delete your account and all associated
            data at any time, without needing to contact us.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">Contact</h2>
          <p>
            Questions about this policy? Reach out at{' '}
            <a
              href="mailto:andrii.vynohradov@gmail.com"
              className="underline underline-offset-2"
            >
              andrii.vynohradov@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </PageShell>
  );
}

export default PrivacyPage;
