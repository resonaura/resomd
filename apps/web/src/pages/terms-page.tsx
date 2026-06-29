import { PageShell } from '@/components/page-shell';
import { AUTH_WEB_URL } from '@/lib/api';
import { useDocumentTitle } from '@/lib/use-document-title';

export function TermsPage() {
  useDocumentTitle('Terms of Use');
  return (
    <PageShell title="Terms of Use" maxWidth="max-w-2xl">
      <div className="text-foreground/90 flex flex-col gap-6 text-sm leading-relaxed">
        <p className="text-muted-foreground">Last updated: June 2026</p>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">
            Accepting these terms
          </h2>
          <p>
            By using ResoMD, you agree to these terms. If you don't agree,
            please don't use the service.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">The service</h2>
          <p>
            ResoMD is a markdown editor with optional cloud sync. The editor
            works without an account; signing in lets you save documents to the
            cloud and access them from any device.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">
            Accounts and authentication
          </h2>
          <p>
            Accounts are managed through our central auth service at{' '}
            <a href={AUTH_WEB_URL} className="underline underline-offset-2">
              {AUTH_WEB_URL.replace(/^https?:\/\//, '')}
            </a>
            . ResoMD does not store passwords — authentication is handled
            entirely by the auth service. The terms of use of the auth service
            also apply to your use of ResoMD. You are responsible for keeping
            your account credentials secure and for any activity that happens
            under your account.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">Your content</h2>
          <p>
            You own the documents you write in ResoMD. We don't claim any rights
            over your content, and we only use it to provide the editing and
            sync features you ask for — for example, generating a PDF when you
            click "Export PDF."
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">Acceptable use</h2>
          <p>
            Don't use ResoMD to store or distribute unlawful content, or to
            attempt to disrupt or gain unauthorized access to the service.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">
            Service availability
          </h2>
          <p>
            ResoMD is provided "as is," without warranties of any kind. We aim
            for reliable sync and storage, but we don't guarantee uninterrupted
            availability and recommend exporting important documents
            periodically.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">Changes</h2>
          <p>
            We may update these terms as the service evolves. Continuing to use
            ResoMD after a change means you accept the updated terms.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">Contact</h2>
          <p>
            Questions about these terms? Reach out at{' '}
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

export default TermsPage;
