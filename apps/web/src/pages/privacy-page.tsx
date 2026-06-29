import { PageShell } from '@/components/page-shell';
import { AUTH_WEB_URL } from '@/lib/api';
import { useDocumentTitle } from '@/lib/use-document-title';

export function PrivacyPage() {
  useDocumentTitle('Privacy Policy');
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
          <h2 className="font-heading text-base font-medium">Authentication</h2>
          <p>
            ResoMD does not handle authentication directly. Sign-in, account
            creation, and profile management are handled by our central auth
            service at{' '}
            <a href={AUTH_WEB_URL} className="underline underline-offset-2">
              {AUTH_WEB_URL.replace(/^https?:\/\//, '')}
            </a>
            . When you sign in, the auth service sets a session cookie named{' '}
            <code className="text-foreground">rsnra_session</code> that is
            shared across all{' '}
            <code className="text-foreground">.rsnra.com</code> subdomains (and
            across <code className="text-foreground">localhost</code> ports in
            development). This cookie contains a signed JWT that identifies your
            account; it does not contain your password.
          </p>
          <p>
            ResoMD never stores or processes passwords. No password hashes are
            kept in the ResoMD database — identity is provided entirely by the
            auth service.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">
            What ResoMD stores
          </h2>
          <p>
            When you save documents to the cloud, ResoMD stores the following
            data linked to your auth user ID:
          </p>
          <ul className="ml-5 list-disc">
            <li>
              Your auth user ID (a UUID) and email address, synced from the auth
              service, so documents can be linked to your account.
            </li>
            <li>
              The documents and folders you save, so they can sync across
              devices.
            </li>
          </ul>
          <p>
            Your display name, avatar, and other profile information are managed
            by the auth service and are not duplicated or stored by ResoMD
            beyond what is needed to link documents to your account.
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
            <li>We don't store passwords or password hashes.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">
            Data retention and deletion
          </h2>
          <p>
            Your documents and folders are kept for as long as your account
            exists. You can delete individual documents and folders from the
            Files page at any time. To delete your account and all associated
            data across all rsnra.com services, use the account management page
            on the{' '}
            <a
              href={`${AUTH_WEB_URL}/profile`}
              className="underline underline-offset-2"
            >
              auth service
            </a>
            .
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">Your rights</h2>
          <p>
            You can view and update your profile information at any time from
            the{' '}
            <a
              href={`${AUTH_WEB_URL}/profile`}
              className="underline underline-offset-2"
            >
              auth service profile page
            </a>
            , and export your documents as markdown files whenever you like.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">Contact</h2>
          <p>
            Questions about this policy? Reach out at{' '}
            <a
              href="mailto:resonaura@gmail.com"
              className="underline underline-offset-2"
            >
              resonaura@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </PageShell>
  );
}

export default PrivacyPage;
