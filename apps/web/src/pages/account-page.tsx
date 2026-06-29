import { ExternalLinkIcon } from 'lucide-react';
import * as React from 'react';

import { PageShell } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { AUTH_WEB_URL } from '@/lib/api';
import { useDocumentTitle } from '@/lib/use-document-title';

export function AccountPage() {
  useDocumentTitle('Account');
  const profileUrl = `${AUTH_WEB_URL}/profile`;

  React.useEffect(() => {
    window.location.href = profileUrl;
  }, [profileUrl]);

  return (
    <PageShell title="Account" maxWidth="max-w-lg">
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          Your account and profile are managed on the central auth service.
          You'll be redirected there shortly.
        </p>
        <Button variant="outline" render={<a href={profileUrl} />}>
          <ExternalLinkIcon className="size-4" />
          Open auth.rsnra.com/profile
        </Button>
      </div>
    </PageShell>
  );
}

export default AccountPage;
