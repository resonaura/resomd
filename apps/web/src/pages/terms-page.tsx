import { PageShell } from '@/components/page-shell';

export function TermsPage() {
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
            works without an account; creating an account lets you save
            documents to the cloud and access them from any device.
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
          <h2 className="font-heading text-base font-medium">
            Account responsibilities
          </h2>
          <p>
            You're responsible for keeping your password secure and for any
            activity that happens under your account. Let us know if you believe
            your account has been compromised.
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

export default TermsPage;
